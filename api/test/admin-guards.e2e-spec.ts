import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ADMIN_REALM_KEY, type AdminRealm } from 'src/common/decorators/adminAuth.decorator';
import { createTestApp, type TestApp } from './utils/app';
import { AdminClient, createAdmin, resetAdminState, signIn } from './utils/admin';

type AdminRoute = { method: string; path: string; realm: AdminRealm | undefined; handler: string };

/**
 * Brief §6: "e2e tests proving every /v1/admin/* route rejects anonymous calls".
 * Routes are discovered from Nest's own metadata, so a new admin controller is
 * covered automatically, and one added WITHOUT a realm decorator fails here.
 */
function discoverAdminRoutes(app: TestApp): AdminRoute[] {
    const reflector = app.get(Reflector);
    const routes: AdminRoute[] = [];
    for (const mod of app.get(ModulesContainer).values()) {
        for (const wrapper of mod.controllers.values()) {
            const ctrl = wrapper.metatype as (new (...args: unknown[]) => object) | null;
            if (!ctrl) continue;
            const base = String(Reflect.getMetadata(PATH_METADATA, ctrl) ?? '').replace(/^\/|\/$/g, '');
            if (base !== 'admin' && !base.startsWith('admin/')) continue;
            const proto = ctrl.prototype as Record<string, unknown>;
            for (const name of Object.getOwnPropertyNames(proto)) {
                const fn = proto[name];
                if (name === 'constructor' || typeof fn !== 'function') continue;
                const method = Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod | undefined;
                if (method === undefined) continue;
                const sub = String(Reflect.getMetadata(PATH_METADATA, fn) ?? '').replace(/^\/|\/$/g, '');
                const path = `/v1/${base}${sub ? `/${sub}` : ''}`.replace(/:(\w+)/g, 'probe-$1');
                const realm = reflector.getAllAndOverride<AdminRealm | undefined>(ADMIN_REALM_KEY, [fn, ctrl]);
                routes.push({
                    method: RequestMethod[method].toLowerCase(),
                    path,
                    realm,
                    handler: `${ctrl.name}.${name}`,
                });
            }
        }
    }
    return routes;
}

describe('admin guard coverage (e2e)', () => {
    let app: TestApp;
    let routes: AdminRoute[];

    beforeAll(async () => {
        app = await createTestApp();
        routes = discoverAdminRoutes(app);
    });

    beforeEach(() => resetAdminState(app));

    afterAll(async () => {
        await app.close();
    });

    it('discovers the admin routes', () => {
        expect(routes.length).toBeGreaterThanOrEqual(10);
    });

    it('every admin handler carries exactly one realm decorator', () => {
        const missing = routes.filter((r) => !r.realm).map((r) => r.handler);
        expect(missing).toEqual([]);
    });

    it('every admin route is a 404 without the gate device header', async () => {
        const server = app.getHttpServer();
        for (const r of routes) {
            const res = await (request(server) as unknown as Record<string, (p: string) => request.Test>)
                [r.method](r.path)
                .set('Origin', 'https://localhost:8443');
            expect({ route: `${r.method} ${r.path}`, status: res.status }).toEqual({
                route: `${r.method} ${r.path}`,
                status: 404,
            });
        }
    });

    it('every @AdminAuth route rejects a gated but anonymous caller with 401', async () => {
        const anon = new AdminClient(app);
        for (const r of routes.filter((x) => x.realm === 'auth')) {
            const path = r.path.replace('/v1/admin', '');
            const send = { get: anon.get, post: anon.post, put: anon.put, patch: anon.patch, delete: anon.delete }[
                r.method as 'get' | 'post' | 'put' | 'patch' | 'delete'
            ];
            if (!send) throw new Error(`no client method for ${r.method} ${r.path}`);
            const res = await send.call(anon, path);
            expect({ route: `${r.method} ${r.path}`, status: res.status }).toEqual({
                route: `${r.method} ${r.path}`,
                status: 401,
            });
        }
    });

    it('a valid session without the device header still gets 404', async () => {
        const { secret } = await createAdmin(app, { totp: true });
        const signedIn = await signIn(app, secret!);
        const res = await request(app.getHttpServer()).get('/v1/admin/auth/me').set('Cookie', signedIn.jar.header());
        expect(res.status).toBe(404);
    });

    it('admin paths are case-sensitive (no /V1/Admin bypass)', async () => {
        const res = await request(app.getHttpServer()).get('/V1/Admin/auth/config').set('X-Admin-Device', 'pc');
        expect(res.status).toBe(404);
    });
});
