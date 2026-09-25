# CLAUDE.md: api

Standalone NestJS 11 service (not part of the frontend workspace). It mirrors `D:\Files\Examination\examination-api` (read-only reference) except where `PLAN.md` §0 or the notes below say otherwise.

## Bootstrap

- `src/main.ts` imports `./assertEnv` **first**. That module has no imports, so it validates `process.env` before `@prisma/client` (which auto-loads a `.env`) can backfill anything. It enforces required/prod-required variables, secret lengths and placeholders, and "outside production, DB/Redis/RMQ must be localhost or `portfolio-*`". We deliberately don't use `@nestjs/config`'s `ConfigModule.forRoot()`, because it backfills from `.env` (the Examination footgun).
- `src/app.setup.ts` is the single place for global HTTP wiring. `main.ts` **and every e2e test** (`test/utils/app.ts`) use it:
  - `createExpressAdapter()` builds Express with **case-sensitive routing** already set. Setting it later is silently ignored.
  - `configureApp()`: `/v1` URI versioning in every environment, helmet (API CSP `default-src 'none'`), 1 MB JSON bodies, cookie-parser, the request logger (never query strings or bodies), `AppValidationPipe`, `ResponseInterceptor`, `ResponseExceptionFilter`, and CORS = the web origin only (admin is same-origin through nginx).
- `main.ts` also attaches the RMQ consumer (exchange `pf.events`, queue `pf.api.events`, DLX `pf.events.dlx` → `pf.api.events.dlq`, manual ack).

## Response contract (same as Examination)

- Success: `{ ok: true, data, locale }`. A `data.message` holding an i18n key is translated.
- Error: `{ ok: false, errors: [{ code, message, scope: 'domain'|'validation', field?, fields? }], locale }`.
- Throw domain errors as `new XException('i18n:ns.KEY')` or `new XException({ i18nKey, args?, fields?, code? })`.
- Validation messages use `i18nValidationMessage('validation.KEY')`. `AppValidationPipe` keeps them untranslated (nestjs-i18n ≥10.8 would pre-translate without property names), and the filter renders them with `properties.<field>`.
- Locale resolution: `?locale=`/`?lang=` → `x-locale` → `preferredLang`/`adminLang` cookie → Accept-Language → `en`.

## Layout

```
src/
  assertEnv.ts            boot-time env validation (first import in main.ts)
  app.setup.ts            global HTTP wiring shared with tests
  api/health/             GET /v1/health (503 if Postgres is down; Redis/RMQ reported only)
  common/
    constants/            env (typed), locales, rateLimits, rabbitmq
    filters/ interceptors/ pipes/ decorators/ guards/   envelope, AppValidationPipe, @RawResponse, @StrictIpThrottle, AppThrottlerGuard
    helpers/{prisma,redis,rmq,s3,mailer,logger}         @Global modules
    i18n/                 nestjs-i18n config + translations/{en,az,ru}/{common,error,validation,properties}.json
    utils/                logger (winston + daily rotate), request (getClientIp), i18n helpers
prisma/
  schema.prisma           full data model (PLAN §5), snake_case via @map/@@map on everything
  migrations/             always create with `--name`
  seed.ts, seed-data.ts   idempotent seed (upserts on natural keys; never overwrites CMS edits)
  seed-assets/            2026 résumé (en) + Examination.az screenshot, uploaded to S3 by the seed
test/
  e2e.env                 committed, throwaway e2e values for localhost containers
  utils/app.ts            createTestApp(): real AppModule + configureApp
  *.e2e-spec.ts
dev/seaweedfs-s3.json     dev-only S3 credentials for portfolio-s3-dev
```

## Services and data

- **Redis:** one shared client with `keyPrefix` (`pf:` in prod, `pf-test:` in e2e). Write keys *without* the prefix. The DB index comes from `REDIS_URL` (prod `/1`, dev `/1`, e2e `/2`).
- **Client IP:** `getClientIp()` trusts `X-Real-IP` (set by nginx) in production only, never `X-Forwarded-For[0]`, which is spoofable.
- **Throttling:** Redis-backed `AppThrottlerGuard` (APP_GUARD, a single `default` throttler, per-route `@Throttle` overrides, `@StrictIpThrottle()` for pre-auth routes).
- **S3:** optional outside production. Without it, media calls return 503. In dev it's SeaweedFS on :9002 (MinIO no longer publishes images).
- **Mail:** optional outside production (JSON transport). Dev uses Mailpit (SMTP :1026, UI http://localhost:8026).

## Dev containers (`docker-compose.dev.yml`, all loopback-only)

| Service | Container | Host port |
|---|---|---|
| Postgres 18 (dev) | portfolio-db-dev | 5436 |
| Postgres 18 (e2e, tmpfs) | portfolio-db-test | 5437 |
| Redis 7 | portfolio-redis-dev | 6382 |
| RabbitMQ 3.13 | portfolio-rabbitmq-dev | 5673 (UI 15673) |
| SeaweedFS S3 | portfolio-s3-dev | 9002 |
| Mailpit | portfolio-mailpit-dev | 1026 (UI 8026) |

## Commands

`yarn start:dev` (starts containers + migrates) · `yarn prisma:dev:migrate --name <x>` · `yarn prisma:dev:seed` · `yarn build` · `yarn typecheck` · `yarn lint` · `yarn test` · `yarn test:e2e` (up db-test, migrate, run, remove) · `yarn ci`

## Conventions

- Controllers stay thin; logic lives in services.
- TypeScript strict (Examination-api runs non-strict; we don't). `module`/`moduleResolution` is `node16`, so package `exports` maps resolve (needed for `@nestjs-modules/mailer/adapters/*`).
- `.env.dev` / `.env.test` locally via `dotenv-cli`; `.env` exists only on the server. Every variable is documented in `.env.example`.
