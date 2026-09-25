import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import Redis from 'ioredis';
import request from 'supertest';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RedisService } from 'src/common/helpers/redis/redis.service';
import { createTestApp, type TestApp } from './utils/app';

class EchoDto {
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    @IsNotEmpty({ message: i18nValidationMessage('validation.NOT_EMPTY') })
    @MaxLength(5, { message: i18nValidationMessage('validation.MAX_LENGTH') })
    name!: string;

    @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
    email!: string;
}

/** Test-only routes that exercise the global pipe / interceptor / filter / throttler. */
@Controller('__test')
class FoundationTestController {
    @Post('echo')
    echo(@Body() dto: EchoDto) {
        return { ...dto, message: 'common.HEALTH_OK' };
    }

    @Get('domain-error')
    domainError() {
        throw new HttpException('i18n:error.CONFLICT', HttpStatus.CONFLICT);
    }

    @Get('crash')
    crash() {
        throw new Error('boom');
    }

    @Get('throttled')
    @Throttle({ default: { limit: 2, ttl: 60_000 } })
    throttled() {
        return { hit: true };
    }
}

describe('foundation (e2e)', () => {
    let app: TestApp;

    beforeAll(async () => {
        app = await createTestApp({ controllers: [FoundationTestController] });
        // Clean slate for throttler counters (keys are pf-test:* in DB 2; see test/e2e.env).
        await app.get(RedisService).client.flushdb();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('health', () => {
        it('GET /v1/health → 200 with every dependency up', async () => {
            const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
            expect(res.body).toMatchObject({
                ok: true,
                locale: 'en',
                data: { status: 'ok', checks: { database: 'up', redis: 'up' }, message: 'Service is healthy' },
            });
        });

        it('translates the envelope message per locale', async () => {
            const res = await request(app.getHttpServer()).get('/v1/health?locale=ru').expect(200);
            expect(res.body.locale).toBe('ru');
            expect(res.body.data.message).toBe('Сервис работает');
        });

        it('resolves the locale from the preferredLang cookie', async () => {
            const res = await request(app.getHttpServer()).get('/v1/health').set('Cookie', 'preferredLang=az');
            expect(res.body.locale).toBe('az');
        });

        it('is versioned and case-sensitive', async () => {
            await request(app.getHttpServer()).get('/health').expect(404);
            await request(app.getHttpServer()).get('/V1/Health').expect(404);
        });

        it('talks to the migrated test database', async () => {
            await expect(app.get(PrismaService).siteProfile.count()).resolves.toBeGreaterThanOrEqual(0);
        });
    });

    describe('error envelope', () => {
        it('unknown route → 404 envelope, localized', async () => {
            const res = await request(app.getHttpServer()).get('/v1/nope?locale=az').expect(404);
            expect(res.body).toEqual({
                ok: false,
                locale: 'az',
                errors: [{ code: 'NOT_FOUND', message: 'Tapılmadı.', scope: 'domain' }],
            });
        });

        it('validation errors are per-field, translated, with property names', async () => {
            const res = await request(app.getHttpServer())
                .post('/v1/__test/echo?locale=en')
                .send({ name: 'toolong', email: 'x' })
                .expect(400);
            expect(res.body.ok).toBe(false);
            expect(res.body.errors).toEqual(
                expect.arrayContaining([
                    {
                        code: 'MAX_LENGTH',
                        field: 'name',
                        scope: 'validation',
                        message: 'Name must be at most 5 characters.',
                    },
                    { code: 'IS_EMAIL', field: 'email', scope: 'validation', message: 'Enter a valid email address.' },
                ]),
            );
        });

        it('rejects unknown properties (whitelist + forbidNonWhitelisted)', async () => {
            const res = await request(app.getHttpServer())
                .post('/v1/__test/echo')
                .send({ name: 'ok', email: 'a@b.co', isAdmin: true })
                .expect(400);
            expect(res.body.errors).toEqual([
                expect.objectContaining({ code: 'NOT_ALLOWED', field: 'isAdmin', scope: 'validation' }),
            ]);
        });

        it('valid body passes through the envelope', async () => {
            const res = await request(app.getHttpServer())
                .post('/v1/__test/echo?locale=az')
                .send({ name: 'ok', email: 'a@b.co' })
                .expect(201);
            expect(res.body).toEqual({
                ok: true,
                locale: 'az',
                data: { name: 'ok', email: 'a@b.co', message: 'Xidmət işləyir' },
            });
        });

        it('i18n domain errors keep their code', async () => {
            const res = await request(app.getHttpServer()).get('/v1/__test/domain-error?locale=ru').expect(409);
            expect(res.body.errors).toEqual([
                { code: 'CONFLICT', message: 'Конфликт с существующими данными.', scope: 'domain' },
            ]);
        });

        it('unexpected errors → 500 UNKNOWN without leaking a stack', async () => {
            const res = await request(app.getHttpServer()).get('/v1/__test/crash').expect(500);
            expect(res.body.errors[0].code).toBe('UNKNOWN');
            expect(JSON.stringify(res.body)).not.toMatch(/at .*\.ts:\d+/);
        });
    });

    describe('throttling (Redis-backed)', () => {
        it('returns a 429 envelope once the per-route budget is spent', async () => {
            const server = app.getHttpServer();
            await request(server).get('/v1/__test/throttled').expect(200);
            await request(server).get('/v1/__test/throttled').expect(200);
            const res = await request(server).get('/v1/__test/throttled').expect(429);
            expect(res.body.errors[0].code).toBe('TOO_MANY_REQUESTS');
        });

        it('stores throttle state under the configured key prefix', async () => {
            // A second, un-prefixed client sees the real key names in the test DB.
            const raw = new Redis(process.env.REDIS_URL as string);
            const keys = await raw.keys('*');
            await raw.quit();
            expect(keys.length).toBeGreaterThan(0);
            expect(keys.every((k) => k.startsWith('pf-test:'))).toBe(true);
        });
    });

    describe('security headers & CORS', () => {
        it('sets helmet headers and hides x-powered-by', async () => {
            const res = await request(app.getHttpServer()).get('/v1/health');
            expect(res.headers['x-powered-by']).toBeUndefined();
            expect(res.headers['x-content-type-options']).toBe('nosniff');
            expect(res.headers['content-security-policy']).toContain("default-src 'none'");
        });

        it('allows the web origin and not the admin origin', async () => {
            const ok = await request(app.getHttpServer()).get('/v1/health').set('Origin', 'http://localhost:5600');
            expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5600');
            const admin = await request(app.getHttpServer())
                .get('/v1/health')
                .set('Origin', 'https://admin.localhost:8443');
            expect(admin.headers['access-control-allow-origin']).toBeUndefined();
        });
    });
});
