import request from 'supertest';
import { ADMIN_COOKIES } from 'src/common/constants/admin';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { createTestApp, type TestApp } from './utils/app';
import { ADMIN_EMAIL, ADMIN_PASSWORD, AdminClient, createAdmin, resetAdminState, signIn, totpAt } from './utils/admin';

describe('admin auth (e2e)', () => {
    let app: TestApp;
    let prisma: PrismaService;

    beforeAll(async () => {
        app = await createTestApp();
        prisma = app.get(PrismaService);
    });

    beforeEach(async () => {
        await resetAdminState(app);
    });

    afterAll(async () => {
        await resetAdminState(app);
        await app.close();
    });

    describe('gate header', () => {
        it('without X-Admin-Device every admin route is a 404', async () => {
            await createAdmin(app);
            const res = await request(app.getHttpServer())
                .post('/v1/admin/auth/login')
                .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            expect(res.status).toBe(404);
            expect(res.headers['set-cookie']).toBeUndefined();
        });

        // Device names are matched case-sensitively: nginx forwards whatever the map says,
        // so a mis-cased enrollment (e.g. "LAPTOP") must fail here too (gate.ps1 now refuses it).
        it.each(['PC; drop', 'LAPTOP', 'Pc', '-pc', 'a'.repeat(33)])(
            'rejects the device name %p with 404',
            async (name) => {
                const c = new AdminClient(app, name);
                expect((await c.get('/auth/pending')).status).toBe(404);
            },
        );
    });

    describe('first login: forced TOTP enrollment', () => {
        it('password → setup → enable → session + 10 recovery codes, and no session before that', async () => {
            await createAdmin(app);
            const c = new AdminClient(app);

            const login = await c.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            expect(login.status).toBe(200);
            expect(login.body.data).toEqual({ step: 'totp-setup' });
            expect(c.jar.get(ADMIN_COOKIES.PENDING)).toBeDefined();
            expect(c.jar.get(ADMIN_COOKIES.ACCESS)).toBeUndefined();
            expect(c.jar.get(ADMIN_COOKIES.REFRESH)).toBeUndefined();

            // The pending state is not a session.
            expect((await c.get('/auth/me')).status).toBe(401);
            // Enrollment steps can't be skipped: verify is the wrong step for a non-enrolled admin.
            expect((await c.post('/auth/totp/verify', { code: '123456' })).status).toBe(403);

            const setup = await c.post('/auth/totp/setup');
            expect(setup.status).toBe(200);
            const { secret, otpauthUrl } = setup.body.data as { secret: string; otpauthUrl: string };
            expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
            // Reloading setup returns the same secret (a scanned QR stays valid).
            expect((await c.post('/auth/totp/setup')).body.data.secret).toBe(secret);
            // Stored encrypted, never in plaintext.
            const row = await prisma.adminUser.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
            expect(row.totpSecretEnc).toMatch(/^v1:/);
            expect(row.totpSecretEnc).not.toContain(secret);

            expect((await c.post('/auth/totp/enable', { code: '000000' })).status).toBe(401);
            const enable = await c.post('/auth/totp/enable', { code: totpAt(secret) });
            expect(enable.status).toBe(200);
            const codes = enable.body.data.recoveryCodes as string[];
            expect(codes).toHaveLength(10);
            expect(new Set(codes).size).toBe(10);
            codes.forEach((code) => expect(code).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/));
            expect(await prisma.adminRecoveryCode.count({ where: { adminId: row.id } })).toBe(10);
            const stored = await prisma.adminRecoveryCode.findMany({ where: { adminId: row.id } });
            stored.forEach((s) => expect(s.codeHash.startsWith('$argon2id$')).toBe(true));

            // Session cookies: host-only, Secure, HttpOnly (except CSRF), SameSite=Strict.
            for (const name of [ADMIN_COOKIES.ACCESS, ADMIN_COOKIES.REFRESH]) {
                const raw = c.jar.raw.get(name) ?? '';
                expect(raw).toMatch(/; Secure/i);
                expect(raw).toMatch(/; HttpOnly/i);
                expect(raw).toMatch(/SameSite=Strict/i);
                expect(raw).toMatch(/Path=\//);
                expect(raw).not.toMatch(/Domain=/i);
            }
            expect(c.jar.raw.get(ADMIN_COOKIES.CSRF)).not.toMatch(/HttpOnly/i);
            expect(c.jar.get(ADMIN_COOKIES.PENDING)).toBeUndefined();

            const me = await c.get('/auth/me');
            expect(me.status).toBe(200);
            expect(me.body.data).toMatchObject({ email: ADMIN_EMAIL, device: 'pc', remainingRecoveryCodes: 10 });

            // Enrollment is a one-time path.
            const again = new AdminClient(app);
            await again.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            expect((await again.post('/auth/totp/setup')).status).toBe(403);
        });
    });

    describe('password step', () => {
        it('wrong password and unknown email look the same', async () => {
            await createAdmin(app);
            const c = new AdminClient(app);
            const wrong = await c.post('/auth/login', { email: ADMIN_EMAIL, password: 'nope' });
            const unknown = await c.post('/auth/login', { email: 'ghost@e2e.test', password: 'nope' });
            expect(wrong.status).toBe(401);
            expect(unknown.status).toBe(401);
            expect(wrong.body.errors[0].code).toBe('INVALID_CREDENTIALS');
            expect(unknown.body.errors[0].code).toBe('INVALID_CREDENTIALS');
            expect(c.jar.get(ADMIN_COOKIES.PENDING)).toBeUndefined();
        });

        it('disabled admins cannot sign in', async () => {
            await createAdmin(app, { disabled: true });
            const res = await new AdminClient(app).post('/auth/login', {
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
            });
            expect(res.status).toBe(401);
        });

        it('rejects a cross-origin login (login CSRF)', async () => {
            await createAdmin(app);
            const res = await new AdminClient(app).post(
                '/auth/login',
                { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
                { origin: 'https://evil.example' },
            );
            expect(res.status).toBe(403);
            expect(res.body.errors[0].code).toBe('CSRF');
        });
    });

    describe('TOTP verification', () => {
        it('accepts a valid code once; the same code cannot be replayed', async () => {
            const { secret } = await createAdmin(app, { totp: true });
            const code = totpAt(secret!, 1);

            const a = new AdminClient(app);
            expect((await a.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).body.data.step).toBe(
                'totp',
            );
            expect((await a.post('/auth/totp/verify', { code })).status).toBe(200);

            const b = new AdminClient(app);
            await b.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            const replay = await b.post('/auth/totp/verify', { code });
            expect(replay.status).toBe(401);
            expect(replay.body.errors[0].code).toBe('INVALID_CODE');
        });

        it('recovery codes work exactly once', async () => {
            const { recoveryCodes } = await createAdmin(app, { totp: true });
            const code = recoveryCodes![0];

            const a = new AdminClient(app);
            await a.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            const ok = await a.post('/auth/totp/verify', { code: code.toUpperCase() });
            expect(ok.status).toBe(200);
            expect(ok.body.data).toEqual({ usedRecoveryCode: true, remainingRecoveryCodes: 9 });

            const b = new AdminClient(app);
            await b.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            expect((await b.post('/auth/totp/verify', { code })).status).toBe(401);
        });

        it('locks the account after 5 bad codes, even for the correct one', async () => {
            const { secret } = await createAdmin(app, { totp: true });
            const c = new AdminClient(app);
            await c.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            for (let i = 0; i < 5; i++)
                expect((await c.post('/auth/totp/verify', { code: '000000' })).status).toBe(401);
            const locked = await c.post('/auth/totp/verify', { code: totpAt(secret!) });
            expect(locked.status).toBe(429);
            expect(locked.body.errors[0].code).toBe('ACCOUNT_LOCKED');
        });

        it('a pending cookie cannot be used from another device', async () => {
            const { secret } = await createAdmin(app, { totp: true });
            const pc = new AdminClient(app, 'pc');
            await pc.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            const laptop = new AdminClient(app, 'laptop');
            laptop.jar.values.set(ADMIN_COOKIES.PENDING, pc.jar.get(ADMIN_COOKIES.PENDING)!);
            const res = await laptop.post('/auth/totp/verify', { code: totpAt(secret!) });
            expect(res.status).toBe(401);
            expect(res.body.errors[0].code).toBe('DEVICE_MISMATCH');
        });
    });

    describe('session', () => {
        it('is bound to the gate device', async () => {
            const { secret } = await createAdmin(app, { totp: true });
            const pc = await signIn(app, secret!, 'pc');
            const thief = new AdminClient(app, 'laptop');
            thief.jar.values.set(ADMIN_COOKIES.ACCESS, pc.jar.get(ADMIN_COOKIES.ACCESS)!);
            const res = await thief.get('/auth/me');
            expect(res.status).toBe(401);
            expect(res.body.errors[0].code).toBe('DEVICE_MISMATCH');
        });

        it('mutations need Origin + the double-submit CSRF token', async () => {
            const { secret } = await createAdmin(app, { totp: true });
            const c = await signIn(app, secret!);
            expect((await c.post('/auth/logout', {}, { csrf: false })).status).toBe(403);
            expect((await c.post('/auth/logout', {}, { origin: 'https://evil.example' })).status).toBe(403);
            expect((await c.get('/auth/me')).status).toBe(200);
            expect((await c.post('/auth/logout')).status).toBe(200);
            expect((await c.get('/auth/me')).status).toBe(401);
        });

        it('refresh rotates tokens; replaying an old one revokes the whole family', async () => {
            const { secret } = await createAdmin(app, { totp: true });
            const c = await signIn(app, secret!);
            const firstRefresh = c.jar.get(ADMIN_COOKIES.REFRESH)!;

            const r1 = await c.post('/auth/refresh');
            expect(r1.status).toBe(200);
            const secondRefresh = c.jar.get(ADMIN_COOKIES.REFRESH)!;
            expect(secondRefresh).not.toBe(firstRefresh);
            expect((await c.get('/auth/me')).status).toBe(200);

            // Within the grace window a replay is a benign race: 401, but nothing is revoked.
            const racer = new AdminClient(app);
            racer.jar.values.set(ADMIN_COOKIES.REFRESH, firstRefresh);
            const race = await racer.post('/auth/refresh');
            expect(race.status).toBe(401);
            expect(race.body.errors[0].code).toBe('REFRESH_RACE');
            expect((await c.get('/auth/me')).status).toBe(200);

            // Outside the window it's theft: the family (including the current session) is revoked.
            await prisma.adminSession.updateMany({
                where: { replacedById: { not: null } },
                data: { revokedAt: new Date(Date.now() - 60_000) },
            });
            const thief = new AdminClient(app);
            thief.jar.values.set(ADMIN_COOKIES.REFRESH, firstRefresh);
            expect((await thief.post('/auth/refresh')).status).toBe(401);
            expect(
                await prisma.auditLog.count({ where: { action: 'auth.refresh_reuse_detected' } }),
            ).toBeGreaterThanOrEqual(1);
            // No cache flush: revocation itself must invalidate the cached session.
            expect((await c.get('/auth/me')).status).toBe(401);
            expect((await c.post('/auth/refresh')).status).toBe(401);
        });

        it('refresh from another device revokes the family', async () => {
            const { secret } = await createAdmin(app, { totp: true });
            const pc = await signIn(app, secret!);
            const laptop = new AdminClient(app, 'laptop');
            laptop.jar.values.set(ADMIN_COOKIES.REFRESH, pc.jar.get(ADMIN_COOKIES.REFRESH)!);
            expect((await laptop.post('/auth/refresh')).status).toBe(401);
            expect((await pc.post('/auth/refresh')).status).toBe(401);
        });

        it('lists sessions per device and revokes one', async () => {
            const { secret } = await createAdmin(app, { totp: true });
            const pc = await signIn(app, secret!, 'pc', 1);
            const laptop = await signIn(app, secret!, 'laptop', -1);
            const list = await pc.get('/auth/sessions');
            expect(list.body.data).toHaveLength(2);
            const other = (list.body.data as { id: string; current: boolean; deviceName: string }[]).find(
                (s) => !s.current,
            )!;
            expect(other.deviceName).toBe('laptop');
            expect((await pc.delete(`/auth/sessions/${other.id}`)).status).toBe(200);
            expect((await laptop.get('/auth/me')).status).toBe(401);
            expect((await pc.get('/auth/me')).status).toBe(200);
        });
    });

    describe('password + TOTP is the only way in', () => {
        it.each(['/auth/google', '/auth/google/callback?state=x&code=y', '/auth/config'])(
            'GET %s does not exist (Google sign-in removed)',
            async (path) => {
                const c = new AdminClient(app);
                expect((await c.get(path, { origin: null })).status).toBe(404);
            },
        );

        it('the pending step carries no sign-in method', async () => {
            await createAdmin(app, { totp: true });
            const c = new AdminClient(app);
            await c.post('/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
            expect((await c.get('/auth/pending')).body.data).toEqual({ step: 'totp' });
        });
    });
});
