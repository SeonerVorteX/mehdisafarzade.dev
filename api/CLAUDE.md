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
  api/content/            public + admin content APIs (posts/tags, projects, experience/education, skills, pages, profile, overview)
  api/media/              media pipeline (presign → PUT → finalize → RMQ → sharp variants) + public redirect
  api/events/             RabbitMQ consumers (media.uploaded, content.changed)
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

## Admin realm (`src/api/admin/*`, PLAN §8.3)

- Reached only as `admin.<domain>/api/*` → nginx device gate → `/v1/admin/*`. The public API vhost 404s `/v1/admin` (case-insensitively).
- **Every admin handler carries exactly one realm decorator** (`common/decorators/adminAuth.decorator.ts`). `test/admin-guards.e2e-spec.ts` discovers all admin routes from Nest metadata and fails CI on a missing decorator or on any route that answers without the required checks.
  - `@AdminAuth()`: `AdminDeviceGuard` (X-Admin-Device from nginx, else **404**) → `AdminJwtGuard` (Passport `admin-jwt`: `__Host-pf_at` cookie, session `sid` still valid, token device = request device) → `AdminCsrfGuard` (unsafe methods: Origin = `ADMIN_ORIGIN` + double-submit `__Host-pf_csrf` / `X-CSRF-Token`).
  - `@AdminPublic()`: device + same-origin check (login, TOTP, refresh, config, pending).
- Sign-in state machine (`auth.service.ts`): email + password (argon2; the only first factor, Google was removed) → `__Host-pf_pending` (5-min JWT, own secret, device-bound) → TOTP setup + enable (the first time, which returns 10 argon2-hashed recovery codes once) or TOTP/recovery-code verify → session. **No session before TOTP.**
- Sessions (`session.service.ts`): 10-min access JWT + opaque rotating refresh token (sha256 in DB). Replaying a rotated token revokes the whole family, except within a 15 s tab-race grace. A device mismatch on refresh also revokes the family. Access checks are Redis-cached for 60 s, and revocation deletes the cache keys.
- TOTP secrets are AES-256-GCM sealed (`common/utils/secretBox.util.ts`, key `TOTP_ENC_KEY`). Codes are burned in Redis for 95 s (no replay). Per-account lockouts (`adminLockout.service.ts`): TOTP 5/15 min, password 10/15 min per email.
- `AuditService` records auth events (success, failures, recovery-code use, refresh reuse, logout) with device + IP. Diffs are redacted.

## Content (Phase 4, PLAN §6/§7)

- **Shape:** each content type has a base row + per-locale translations. Public reads pick the requested locale and fall back to `en`, returning `locale` + `fallback: true` so the web can show a notice. Publishing (and scheduling) requires a complete `en` translation (`completeness()` in `common/utils/content.util.ts`); the `en` translation of a live item can't be deleted.
- **Slugs:** unique per locale (posts/pages/tags) or global (projects), generated with az/ru transliteration when omitted. A post found by another locale's slug still resolves, and `alternates` gives the canonical slug per locale.
- **Cache:** public reads go through `ContentCacheService.wrap(key, tags, load)` (Redis, 5 min, tag sets). Every write calls `RevalidationService.contentChanged(tags)`: that invalidates synchronously, then publishes `content.changed`; the consumer POSTs an HMAC-signed webhook to each `WEB_REVALIDATE_URLS` (all web colours). The tags are shared with the web (`frontend/packages/api/paths.ts#cacheTags`); `all` = full revalidation (`POST /v1/admin/revalidate/all`).
- **Scheduling:** `PublishSchedulerService` runs every minute behind the Redis lock `lock:publish-scheduled` (owner-checked release). `publishDue` is conditional per row, so a concurrent unpublish wins.
- **Preview:** `/v1/preview/{posts,projects,pages}/:id` need `x-preview-timestamp` + `x-preview-signature` (HMAC of path + ts with `PREVIEW_SECRET`, 5-min window); anything else is 404.
- **Media:** the bucket is private. Presigned PUTs sign content-type + content-length, and the S3 client disables flexible checksums (otherwise the SDK signs an empty-body CRC32 and every browser upload fails). `finalize` sniffs magic bytes; images get AVIF/WebP at 480/960/1600 (never upscaled) + a WebP LQIP, EXIF stripped. `GET /v1/media/:id/:variant` 302s to a 10-min presigned URL; image originals are never served. Delete is refused while `usage()` finds references.
- **Audit:** `@AdminAuth()` includes `AuditInterceptor`, which logs `<entity>.<handler>` for every successful mutation (entity from `@AuditEntity`), with a redacted body.
- **Contract:** `test/contract.e2e-spec.ts` snapshots every route (OpenAPI from `@nestjs/swagger`, served at `/v1/docs` outside production). After an intended route change, run the e2e with `-u` and review the snapshot diff, then update `frontend/packages/api`.

## Services and data

- **Redis:** one shared client with `keyPrefix` (`pf:` in prod, `pf-test:` in e2e). Write keys *without* the prefix. The DB index comes from `REDIS_URL` (prod `/1`, dev `/1`, e2e `/2`).
- **Trust boundary:** `ADMIN_TRUSTED_SOURCES` (exact IPs; prod = portfolio bridge gateway + admin blue/green, see `deploy/ip-plan.env`). `AdminDeviceGuard` 404s unless the TCP peer is in it, and `getClientIp()` honors `X-Real-IP` only from it (never `X-Forwarded-For`). Production refuses to boot without a valid list. Tested by `test/admin-trust.e2e-spec.ts` with distinct loopback source IPs.
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
