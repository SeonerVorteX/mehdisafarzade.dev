import * as argon from 'argon2';
import { authenticator } from 'otplib';
import request from 'supertest';
import { TotpService } from 'src/api/admin/auth/totp.service';
import { ADMIN_COOKIES } from 'src/common/constants/admin';
import { ADMIN_ORIGIN } from 'src/common/constants/env';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RedisService } from 'src/common/helpers/redis/redis.service';
import type { TestApp } from './app';

export const ADMIN_EMAIL = 'admin@e2e.test';
export const ADMIN_PASSWORD = 'correct horse battery staple';

/** Minimal cookie jar: applies Set-Cookie (incl. clears) and renders a Cookie header. */
export class CookieJar {
    readonly values = new Map<string, string>();
    readonly raw = new Map<string, string>();

    absorb(res: request.Response): this {
        const header = res.headers['set-cookie'] as unknown as string[] | string | undefined;
        for (const line of ([] as string[]).concat(header ?? [])) {
            const [pair] = line.split(';');
            const eq = pair.indexOf('=');
            const name = pair.slice(0, eq).trim();
            const value = pair.slice(eq + 1).trim();
            const cleared = /max-age=0/i.test(line) || /expires=thu, 01 jan 1970/i.test(line) || value === '';
            if (cleared) {
                this.values.delete(name);
                this.raw.delete(name);
            } else {
                this.values.set(name, value);
                this.raw.set(name, line);
            }
        }
        return this;
    }

    header(): string {
        return [...this.values].map(([k, v]) => `${k}=${v}`).join('; ');
    }

    get(name: string): string | undefined {
        return this.values.get(name);
    }
}

/**
 * An admin-side HTTP client that behaves like a browser behind the nginx gate:
 * it sends X-Admin-Device, Origin: ADMIN_ORIGIN, cookies, and the double-submit
 * CSRF header on mutations.
 */
export class AdminClient {
    readonly jar = new CookieJar();
    constructor(
        private readonly app: TestApp,
        public device = 'pc',
    ) {}

    private decorate(req: request.Test, opts: { csrf?: boolean; origin?: string | null } = {}) {
        if (this.device) req.set('X-Admin-Device', this.device);
        if (opts.origin !== null) req.set('Origin', opts.origin ?? ADMIN_ORIGIN);
        const cookie = this.jar.header();
        if (cookie) req.set('Cookie', cookie);
        const csrf = this.jar.get(ADMIN_COOKIES.CSRF);
        if (opts.csrf !== false && csrf) req.set('X-CSRF-Token', csrf);
        return req;
    }

    async get(path: string, opts: { origin?: string | null } = {}) {
        const res = await this.decorate(request(this.app.getHttpServer()).get(`/v1/admin${path}`), opts);
        this.jar.absorb(res);
        return res;
    }

    async post(path: string, body?: object, opts: { csrf?: boolean; origin?: string | null } = {}) {
        const res = await this.decorate(request(this.app.getHttpServer()).post(`/v1/admin${path}`), opts).send(
            body ?? {},
        );
        this.jar.absorb(res);
        return res;
    }

    async put(path: string, body?: object) {
        const res = await this.decorate(request(this.app.getHttpServer()).put(`/v1/admin${path}`)).send(body ?? {});
        this.jar.absorb(res);
        return res;
    }

    async patch(path: string, body?: object) {
        const res = await this.decorate(request(this.app.getHttpServer()).patch(`/v1/admin${path}`)).send(body ?? {});
        this.jar.absorb(res);
        return res;
    }

    async delete(path: string, opts: { csrf?: boolean; origin?: string | null } = {}) {
        const res = await this.decorate(request(this.app.getHttpServer()).delete(`/v1/admin${path}`), opts);
        this.jar.absorb(res);
        return res;
    }
}

/** A TOTP code for a given offset in 30 s steps (0 = now). Distinct steps avoid the replay guard between calls. */
export function totpAt(secret: string, stepOffset = 0): string {
    return authenticator.clone({ epoch: Date.now() + stepOffset * 30_000 }).generate(secret);
}

export async function resetAdminState(app: TestApp): Promise<void> {
    const prisma = app.get(PrismaService);
    await prisma.auditLog.deleteMany();
    await prisma.adminUser.deleteMany(); // cascades sessions + recovery codes
    await app.get(RedisService).client.flushdb();
}

export async function createAdmin(
    app: TestApp,
    opts: { totp?: boolean; email?: string; disabled?: boolean } = {},
): Promise<{ id: string; email: string; secret?: string; recoveryCodes?: string[] }> {
    const prisma = app.get(PrismaService);
    const totp = app.get(TotpService);
    const email = opts.email ?? ADMIN_EMAIL;
    const secret = opts.totp ? totp.newSecret() : undefined;
    const admin = await prisma.adminUser.create({
        data: {
            email,
            passwordHash: await argon.hash(ADMIN_PASSWORD, { type: argon.argon2id }),
            totpSecretEnc: secret ? totp.seal(secret) : null,
            totpEnabledAt: secret ? new Date() : null,
            disabledAt: opts.disabled ? new Date() : null,
        },
    });
    let recoveryCodes: string[] | undefined;
    if (secret) {
        const generated = await totp.generateRecoveryCodes();
        recoveryCodes = generated.codes;
        await prisma.adminRecoveryCode.createMany({
            data: generated.hashes.map((codeHash) => ({ adminId: admin.id, codeHash })),
        });
    }
    return { id: admin.id, email, secret, recoveryCodes };
}

/** Full password + TOTP login for an enrolled admin; returns the signed-in client. */
export async function signIn(app: TestApp, secret: string, device = 'pc', step = 1): Promise<AdminClient> {
    const client = new AdminClient(app, device);
    const login = await client.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
    const verify = await client.post('/auth/totp/verify', { code: totpAt(secret, step) });
    if (verify.status !== 200) throw new Error(`verify failed: ${verify.status} ${JSON.stringify(verify.body)}`);
    return client;
}
