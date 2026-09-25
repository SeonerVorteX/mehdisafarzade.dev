import { VersioningType, type INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

/**
 * The Express instance must be created with routing settings already applied:
 * Express builds its router with the settings it has at that moment, and a later
 * `app.set('case sensitive routing', true)` is silently ignored (the e2e test
 * `GET /V1/Health → 404` caught exactly that). Case-sensitive routing matters
 * because Express otherwise matches `/V1/Admin/...`, which would slip past a
 * case-sensitive nginx rule on the public API vhost (PLAN §15 R2).
 */
export function createExpressAdapter(): ExpressAdapter {
    const instance = express();
    instance.set('case sensitive routing', true);
    instance.set('strict routing', false);
    instance.disable('x-powered-by');
    return new ExpressAdapter(instance);
}

/**
 * Global HTTP wiring shared by `main.ts` and every e2e test, so tests exercise
 * exactly what production runs. Examination wires these imperatively in
 * `main.ts`; we keep that style but in one reusable function.
 *
 * Unlike Examination, URI versioning is enabled in EVERY environment (agreed in
 * Phase 0; Examination only enables prefix/versioning outside production).
 */
export function configureApp<T extends INestApplication>(app: T): T {
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    return app;
}
