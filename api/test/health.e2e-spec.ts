import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp, createExpressAdapter } from 'src/app.setup';

describe('health (e2e)', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = configureApp(moduleRef.createNestApplication<INestApplication<App>>(createExpressAdapter()));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /v1/health → 200', async () => {
        const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
        expect(res.body.status).toBe('ok');
    });

    it('routes are versioned: GET /health → 404', async () => {
        await request(app.getHttpServer()).get('/health').expect(404);
    });

    it('routing is case-sensitive: GET /V1/Health → 404', async () => {
        await request(app.getHttpServer()).get('/V1/Health').expect(404);
    });
});
