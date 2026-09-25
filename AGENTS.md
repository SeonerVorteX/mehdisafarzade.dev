# AGENTS.md

Guidance for coding agents working in this repository. Prefer what the code does over what docs say; never document secrets or env values.

## Project overview

`mehdisafarzade.dev` v2: a personal portfolio with a public site, a separate admin CMS, and a NestJS API, in az/en/ru. One git repo, two independently built/deployed halves:

```text
frontend/      Yarn 4 + Turbo workspace (like Examination's examination/)
  apps/web     public site  → https://www.mehdisafarzade.dev   (dev :5600)
  apps/admin   admin CMS    → https://admin.mehdisafarzade.dev (dev :5603, behind the nginx device gate)
  packages/    api (fetcher/envelope/paths), i18n, ui (styles + primitives), config (env, eslint), types
api/           standalone NestJS 11 (like examination-api/). NOT a workspace member: own package.json/yarn.lock/Dockerfile
deploy/        nginx vhost/snippet/map templates, device-gate script, rollback scripts (no secrets, ever)
legacy/        old Next 14 site, reference only, deleted in Phase 10
PLAN.md        the approved plan (phases, data model, API, security design). Read it before non-trivial work.
SEED_REVIEW.md seeded content still awaiting the owner's confirmation
```

The reference architecture is the owner's Examination project (`D:\Files\Examination`, **read-only**). Copy its patterns and conventions; `PLAN.md` §0 records every deliberate deviation.

## Commands

Yarn is pinned per half via `.yarn/releases/yarn-4.12.0.cjs` + `yarnPath`. If the global `yarn` resolves a different version (a user-level `~/.yarnrc.yml` can override it), call the pinned release directly: `node .yarn/releases/yarn-4.12.0.cjs <cmd>`.

Frontend (`frontend/`): `yarn install`, `yarn dev`, `yarn build`, `yarn typecheck`, `yarn lint`, `yarn test`, `yarn i18n:check`, `yarn ci`.

API (`api/`): `yarn prestart:dev` (dev containers), `yarn start:dev`, `yarn build`, `yarn lint`, `yarn test`, `yarn test:e2e` (disposable test DB), `yarn ci`.

## Conventions

- TypeScript strict everywhere. No `any` without an explanatory `eslint-disable` comment.
- API responses use the Examination envelope: `{ ok: true, data, locale }` / `{ ok: false, errors[{code,message,scope,field?}], locale }`.
- API error messages are i18n keys: `i18n:<namespace>.<KEY>`.
- All routes are versioned (`/v1`) in every environment, and Express routing is case-sensitive (see `api/src/app.setup.ts`).
- DB tables/columns are snake_case via `@@map`/`@map` on every model/field; TS stays camelCase.
- Frontend: `page.tsx` is a thin server component; interactive UI lives in a co-located `*Page.tsx` or `views/`; server fetchers are `lib/getServer*.ts`; one folder per component; every UI string goes through next-intl.
- Web must never import admin code (`@portfolio/api/admin` is banned by ESLint in `apps/web`), and never learn the admin hostname.
- Conventional commits, on branch `v2`. No push until the owner says so.

## Safety rules

- Never read, print, or commit `.env*` values, tokens, keys, certificates, or device-gate `*.map`/`*.unlock` files.
- Never modify anything under `D:\Files\Examination` (the only exception is an approved nginx-mirror diff in Phase 9).
- VPS (`ssh root@examination`): read-only commands only, unless the owner approves the exact commands first. Never touch Examination containers, the shared `db`/`redis`/`rabbitmq` stack, or existing vhosts.
- No destructive git operations (reset --hard, force push, history rewrites).
- Every published Docker port must be bound to `127.0.0.1`.

## Before / after editing

- Read this file, `PLAN.md`, and the nearest `CLAUDE.md`.
- Run the narrowest tests first, then `yarn ci` in the half you touched.
- Summarise changed files, checks run, and remaining risks.
