import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import type { INestApplication, Type } from '@nestjs/common';
import type { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp, createExpressAdapter } from 'src/app.setup';

export type TestApp = INestApplication<App>;

/**
 * Boots the real AppModule with the exact production HTTP wiring (configureApp),
 * against the disposable test services from docker-compose.dev.yml.
 */
export async function createTestApp(
    opts: { controllers?: Type[]; override?: (b: TestingModuleBuilder) => TestingModuleBuilder } = {},
): Promise<TestApp> {
    let builder = Test.createTestingModule({ imports: [AppModule], controllers: opts.controllers ?? [] });
    if (opts.override) builder = opts.override(builder);
    const moduleRef = await builder.compile();
    const app = configureApp(moduleRef.createNestApplication<TestApp>(createExpressAdapter(), { logger: false }));
    await app.init();
    return app;
}
