// This file models the production IP plan (PLAN §9.2) on loopback addresses, and must
// set the trust list BEFORE the app modules load (constants are read at import):
//   gateway (host nginx) 127.0.0.10 · admin blue/green 127.0.0.31/.32   → trusted
//   web blue 127.0.0.21 · backend-network container 127.0.0.18         → NOT trusted
const previousTrust = process.env.ADMIN_TRUSTED_SOURCES;
process.env.ADMIN_TRUSTED_SOURCES = '127.0.0.10,127.0.0.31,127.0.0.32';

import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { getClientIp } from 'src/common/utils/request.util';
import { createTestApp, type TestApp } from './utils/app';
import { createAdmin, resetAdminState } from './utils/admin';

const SOURCES = {
    gateway: '127.0.0.10',
    adminBlue: '127.0.0.31',
    adminGreen: '127.0.0.32',
    webBlue: '127.0.0.21',
    backend: '127.0.0.18',
} as const;

@Controller('__test-trust')
class TrustEchoController {
    @Get('client-ip')
    clientIp(@Req() req: Request) {
        return { ip: getClientIp(req) };
    }
}

type Reply = { status: number; body: { ok?: boolean; data?: Record<string, unknown> } };

describe('admin header trust boundary (e2e)', () => {
    let app: TestApp;
    let port: number;

    /** A real TCP request from a specific source IP (what the API sees as the peer). */
    function call(from: string, path: string, headers: Record<string, string> = {}): Promise<Reply> {
        return new Promise((resolve, reject) => {
            const req = http.request(
                { host: '127.0.0.1', port, path, method: 'GET', localAddress: from, headers },
                (res) => {
                    let raw = '';
                    res.on('data', (d: Buffer) => (raw += d.toString()));
                    res.on('end', () =>
                        resolve({ status: res.statusCode ?? 0, body: raw ? (JSON.parse(raw) as Reply['body']) : {} }),
                    );
                },
            );
            req.on('error', reject);
            req.end();
        });
    }

    beforeAll(async () => {
        app = await createTestApp({ controllers: [TrustEchoController] });
        await app.listen(0, '127.0.0.1');
        port = ((app.getHttpServer() as unknown as http.Server).address() as AddressInfo).port;
        await resetAdminState(app);
        await createAdmin(app, { totp: true });
    });

    afterAll(async () => {
        await resetAdminState(app);
        await app.close();
        // e2e files share one process (--runInBand): don't leak this list into later files.
        process.env.ADMIN_TRUSTED_SOURCES = previousTrust;
    });

    const device = { 'X-Admin-Device': 'pc' };

    it.each([
        ['host nginx (portfolio gateway)', SOURCES.gateway],
        ['admin container (blue)', SOURCES.adminBlue],
        ['admin container (green)', SOURCES.adminGreen],
    ])('X-Admin-Device from %s is accepted', async (_label, from) => {
        const res = await call(from, '/v1/admin/auth/pending', device);
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ step: null });
    });

    it.each([
        ['the web container', SOURCES.webBlue],
        ['the backend network (Examination containers)', SOURCES.backend],
        ['plain loopback (not in the production list)', '127.0.0.1'],
    ])('X-Admin-Device from %s gets 404', async (_label, from) => {
        expect((await call(from, '/v1/admin/auth/pending', device)).status).toBe(404);
        expect((await call(from, '/v1/admin/auth/me', device)).status).toBe(404);
    });

    it('a trusted peer without the header still gets 404', async () => {
        expect((await call(SOURCES.gateway, '/v1/admin/auth/pending')).status).toBe(404);
    });

    it('X-Real-IP is honored only from trusted peers', async () => {
        const spoof = { 'X-Real-IP': '6.6.6.6' };
        expect((await call(SOURCES.gateway, '/v1/__test-trust/client-ip', spoof)).body.data).toEqual({ ip: '6.6.6.6' });
        expect((await call(SOURCES.adminBlue, '/v1/__test-trust/client-ip', spoof)).body.data).toEqual({
            ip: '6.6.6.6',
        });
        expect((await call(SOURCES.webBlue, '/v1/__test-trust/client-ip', spoof)).body.data).toEqual({
            ip: SOURCES.webBlue,
        });
        expect((await call(SOURCES.backend, '/v1/__test-trust/client-ip', spoof)).body.data).toEqual({
            ip: SOURCES.backend,
        });
    });

    it('X-Forwarded-For is never used', async () => {
        const res = await call(SOURCES.webBlue, '/v1/__test-trust/client-ip', { 'X-Forwarded-For': '6.6.6.6' });
        expect(res.body.data).toEqual({ ip: SOURCES.webBlue });
    });
});
