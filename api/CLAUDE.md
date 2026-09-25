# CLAUDE.md: api

Standalone NestJS 11 service (not part of the frontend workspace). It mirrors `D:\Files\Examination\examination-api` (read-only reference) except where `PLAN.md` §0 says otherwise.

## Bootstrap

- `src/app.setup.ts` is the single place for global HTTP wiring. `main.ts` **and every e2e test** use it, so tests run exactly what production runs.
  - `createExpressAdapter()` creates the Express instance with **case-sensitive routing** already set. Setting it after Nest has built the router is silently ignored, as `test/health.e2e-spec.ts` proves.
  - `configureApp()` turns on URI versioning (`/v1`) in **every** environment. Examination does this only outside production (its A3 issue).

## Layout (grows per phase; see `PLAN.md` §6)

```
src/
  api/<feature>/        thin controllers + services (health today)
  common/               filters, interceptors, guards, strategies, helpers/{prisma,redis,rmq,s3,mailer,logger,audit}, i18n
prisma/                 schema (snake_case via @@map/@map everywhere), migrations, seed
test/                   e2e specs (jest-e2e.json)
docker-compose.dev.yml  portfolio-* dev/test containers (ports 5436/5437/6382/5673/9002/1026 + UIs)
```

## Conventions

- Controllers stay thin; logic lives in services.
- Errors are thrown as Nest exceptions carrying `'i18n:<ns>.<KEY>'`.
- TypeScript strict (Examination-api runs non-strict; we don't).
- `.env.dev` / `.env.test` locally through `dotenv-cli`; `.env` exists only on the server. Every variable is documented in `.env.example`.

## Commands

`yarn start:dev` · `yarn build` · `yarn typecheck` · `yarn lint` · `yarn test` · `yarn test:e2e` · `yarn ci`
