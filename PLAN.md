# PLAN.md — mehdisafarzade.dev v2

Status: **Phase 0 approved 2026-09-25** (decisions in §0). Branch `v2` is cut from `origin/main` @ `b2adc49`. Not pushed yet; it waits until Vercel's Git integration is disconnected.

## 0. Decision log (Phase 0 approval, 2026-09-25)

| Topic | Decision |
|---|---|
| Admin session before TOTP | **None.** First login: password → forced TOTP enrollment → 10 single-use **recovery codes** shown once, stored as argon2 hashes → session. |
| Google sign-in | Always followed by TOTP. Requires `email_verified`, email ∈ `ADMIN_GOOGLE_ALLOWLIST` **and** an existing, **active** (`disabledAt` null) `AdminUser`. No auto-provisioning. |
| LinkedIn | `https://www.linkedin.com/in/mehdi-safarzade` |
| Résumé | The 2026 GitHub PDF (en) is seeded; the Dec 2024 PDF is dropped. The 2026 résumé is the source for the experience timeline. |
| GHCR | One `mehdisafarzade.dev-frontend` package with `web-*`/`admin-*` tags + **tag-aware retention** (§9.3). |
| Display font | Fraunces vs Instrument Serif side by side in the Phase 5 style tile. |
| AOP | **Per-hostname AOP with our own client cert** for www/apex/api/admin (§9.6), available on the Free plan. Zone-level stays as the fallback until it's verified. |
| RabbitMQ vhost | `portfolio` (no slash). |
| Postgres | Role `portfolio` owns only DB `portfolio`, no SUPERUSER/CREATEDB/CREATEROLE. No `portfolio_migrator` is needed (see §9.5). |
| Examination findings | Handled separately by you. Nothing changes in Examination or on the server for them. |
| VPS-mirror script diff (§10) | Approved **as a proposal**. Prepared for Phase 9, not applied. |
| Phases 1–3 | Local only. Stop at the Phase 3 ☑. |

Sources this plan is built from, in priority order:
1. The Phase 0 answers + the four brief changes (device gate, one repo, VPS rules, Cloudflare checklist).
2. `PORTFOLIO_REBUILD_PROMPT.md` (the original brief), for product scope.
3. Examination's **code** (not its docs), for conventions and versions.
4. Read-only inspection of the VPS (2026-09-25), recorded in §1.

---

## 1. Findings that change the plan (read-only VPS inspection, 2026-09-25)

| # | Finding | Effect on this plan |
|---|---|---|
| F1 | **Examination's frontend containers publish on `0.0.0.0:4001/4002/4101/4102/4201/4202`, and Docker's iptables rules run ahead of UFW** (`DOCKER-USER` chain is empty). Confirmed from outside: `http://<server-ip>:4201/` → `307` (Examination admin), `:4001/` → `200` (landing). These bypass Cloudflare, nginx, Authenticated Origin Pulls and every nginx rate limit. UFW only denies 4001/4002/4101/4102, not 4201/4202, but that doesn't matter because Docker's rules are evaluated first. | Every portfolio container publishes on **`127.0.0.1` only**. This is a hard rule, and CI checks for it (the deploy fails if a compose `ports:` entry doesn't start with `127.0.0.1:`). The device gate is useless on any host whose upstream is also published on a public port, so Examination's ports must be fixed before the gate is reused for `examination-admin`. I'm not touching Examination (see §16). |
| F2 | UFW has both the Cloudflare-only `80,443` rules **and** `80/443 ALLOW Anywhere`, so the Cloudflare-only rules have no effect. | No change needed for us: the protection is AOP (`ssl_verify_client on`) on every vhost, which we copy. Noted in `DEPLOY.md` as a possible later hardening step (drop the `Anywhere` rules). |
| F3 | TLS uses Cloudflare origin certs in `/etc/ssl/cloudflare/` plus `cf-origin-pull-ca.pem`. There's no certbot and no `/etc/letsencrypt`. | Portfolio cert goes to `/etc/ssl/cloudflare/mehdisafarzade.dev.{pem,key}` (key `0600`). |
| F4 | Postgres 18 (`db`) has one role, `postgres` (superuser), and databases `postgres` and `examination`. RabbitMQ has vhost **`examination`** (no leading slash) and user `examination`. Redis 7 has no ACL users (just `requirepass`). | New Postgres role `portfolio` (NOSUPERUSER, NOCREATEDB) that owns database `portfolio`. RabbitMQ vhost **`portfolio`** (no slash, same as the live naming; `/portfolio` would need `%2F` in URLs) with user `portfolio` given permissions on that vhost only. Redis: DB index `1` + key prefix `pf:`, as agreed. The shared-password caveat is in §15 R6. |
| F5 | Free host ports: 3001/3002 and 4001–4202 are taken. **Portfolio uses 3101/3102 (api), 4301/4302 (web), 4311/4312 (admin), all bound to `127.0.0.1`.** Docker network `backend` holds Examination + `db`/`redis`/`rabbitmq`, and Examination's frontends reach their API at `http://api:3000`. | Portfolio service names are `portfolio-api`, `portfolio-web`, `portfolio-admin`. See §9.2 for the network layout. |
| F6 | nginx is 1.24.0. `conf.d/` is empty but included in `http {}`. `snippets/` exists. `/etc/nginx/device-gate/` doesn't exist. `deploy-nginx.sh` and `check-drift.sh` handle **only** `nginx.conf` and `sites-enabled/*.conf`. | The generic gate maps go in `conf.d/device-gate.conf` and the per-server check in `snippets/device-gate.conf`, so both VPS scripts need extending (§10.3). Because they never read `/etc/nginx/device-gate/`, the secret maps already stay out of the mirror repo; I'll add an explicit exclusion anyway so that stays true if the scripts later switch to syncing whole directories. nginx 1.24 means `listen 443 ssl http2;` (not `http2 on;`), as `VPS/CLAUDE.md` N15 records. |
| F7 | Resources: 6 vCPU, 11 GiB RAM (9.5 available), 66 GB disk free, 3.6 GB of reclaimable images. | Plenty of room. Two colours × three services at about 150–250 MB each is fine. |
| F8 | `/apps/examination/local.dump` (9 MB, `-rw-r--r--`, in a `755` directory) is readable by every local user. | Not ours. Reported to you, not touched. |
| F9 | Deploy directories are `/apps/examination/examination-{api,monorepo,infra}`, owned by `mehdi:www-data`, `0750`, each a local git repo for drift. | Portfolio uses **`/apps/mehdisafarzade.dev/{frontend,api}`** with the same ownership, the same local-git-repo pattern, and `.env*` created by you. |

### Differences between GitHub `main` and the old local clone
The local clone was 5 commits behind with nothing unpushed. It's now fast-forwarded, and `v2` is based on `origin/main`. What's on GitHub differs from what I summarised in the first message:
- `data.ts` now lists **only Examination.az** as a project. The older projects were removed from the live site in 2026.
- The bio is newer ("19-year-old … professionally since 2021 … UNEC"), and the tags now include PostgreSQL/Prisma/RabbitMQ/AWS.
- **LinkedIn is `https://linkedin.com/in/mehdi-safarzade`** in both the live site and the new résumé. Your answer said `/in/seonervortex` (→ `SEED_REVIEW.md` S-02).
- `Resume.pdf` is a **new, 2026 résumé** (generated with ReportLab, 5.6 KB). It includes Heroic.art (Lead Full-Stack, Mar 2025 – present), self-employed via Upwork (Top Rated, 100% JSS), Mobius, and BakuDevsGroup **Sep 2021 – Jan 2022** (the Dec 2024 PDF said "– 01/2024"). You said to seed "the Dec 2024 PDF"; I plan to **seed the current GitHub PDF as the English résumé** instead, still marked `needsReview` (→ S-10). Tell me if you really want the older file.

---

## 2. Repository layout (one repo; change 1)

```
mehdisafarzade.dev/                         git, branch v2 (remote: github.com/SeonerVorteX/mehdisafarzade.dev)
├── CLAUDE.md  AGENTS.md  PLAN.md  SEED_REVIEW.md  DEPLOY.md  CLOUDFLARE.md
├── .gitignore                              + *.map (except *.map.example), deploy/device-gate/.local/, .env*, certs
├── frontend/                               Yarn 4 + Turbo workspace (mirrors examination/)
│   ├── package.json  turbo.json  yarn.lock  .yarnrc.yml  tsconfig.base.json  eslint.config.mjs
│   ├── Dockerfile                          one file, ARG APP=web|admin (turbo prune → next standalone)
│   ├── docker-compose.yml / .blue.yml / .green.yml
│   ├── apps/web                            @portfolio/web   dev :5600
│   ├── apps/admin                          @portfolio/admin dev :5603
│   ├── packages/api                        fetcher/APIError/envelope, apiPaths, types, query defaults, errorToForm
│   ├── packages/i18n                       LOCALES, config, locales/{global,web,admin}/{az,en,ru}.json, i18n:check script
│   ├── packages/ui                         shared primitives + styles (root.scss/_index.scss chain like @examination/ui)
│   ├── packages/config                     env (zod-validated), constants, shared eslint/prettier/tsconfig
│   ├── packages/markdown                   unified pipeline shared by web render + admin live preview
│   └── packages/types
├── api/                                    standalone NestJS 11, NOT a workspace member
│   ├── package.json  yarn.lock  .yarnrc.yml  Dockerfile  nest-cli.json
│   ├── docker-compose.dev.yml / .yml / .blue.yml / .green.yml
│   ├── src/{api,common}/…  prisma/  test/
│   └── .env.example                        (.env.dev/.env.test local, .env on server only)
├── deploy/
│   ├── nginx/sites-enabled/portfolio.conf
│   ├── nginx/conf.d/device-gate.conf       generic http{}-level maps (no secrets)
│   ├── nginx/snippets/device-gate.conf     generic server{}-level check (no secrets)
│   ├── nginx/upstreams/portfolio_{api,web,admin}_targets.conf.example
│   ├── nginx/device-gate/portfolio-admin.map.example
│   ├── nginx/test/                         docker-based gate test harness (§10.4)
│   ├── device-gate/gate.ps1  README.md     (.local/ git-ignored)
│   ├── rollback-api.sh  rollback-frontend.sh
├── legacy/                                 old Next 14 site (moved in Phase 1, deleted in Phase 10)
└── .github/workflows/
    ├── ci.yml                              PR/push to v2: frontend ci + api ci, path-filtered
    ├── deploy-frontend.yml                 on: push main, paths: frontend/**, deploy/nginx/upstreams/**
    └── deploy-api.yml                      on: push main, paths: api/**
```

Notes
- There's no root `package.json`, so Vercel breaks on the first push of `v2` (§13 step 0).
- Package scope is `@portfolio/*`. Apps list packages in `transpilePackages` (Examination rule 11).
- Admin code must not end up in the web bundle. That's enforced by (a) separate apps, (b) an ESLint `no-restricted-imports` rule in `apps/web` banning `@portfolio/*/admin*` entry points, and (c) a CI step that greps `.next/static` in the web build for admin-only markers.

---

## 3. Stack and versions

Versions come from Examination's `package.json` files, not guesses. Where Examination has version skew, we align (as agreed).

| Area | Choice |
|---|---|
| Runtime | Node 22 (alpine) in Docker; Yarn 4.12.0 (frontend), 4.12.0 (api; Examination-api is 4.9.4, and a single version is simpler) |
| Frontend | next ^16.1.6 (`proxy.ts` **at `src/proxy.ts`**), react/react-dom ^19.2.4, TS ^5 strict, turbo ^2.9.16, tailwindcss/@tailwindcss/postcss ^4.1, sass ^1.92, next-intl ^4.4, @tanstack/react-query ^5.90, react-hook-form ^7.75 + @hookform/resolvers ^5.2 + zod ^4.1, framer-motion ^12.23, dayjs ^1.11, clsx ^2.1, lucide-react ^1.8, react-hot-toast ^2.6, vitest |
| Lint | ESLint 9 flat config (`eslint-config-next` matching Next 16), Prettier 3. Not `next lint`, which Next 16 removed. |
| Backend | @nestjs/* **all ^11**, @nestjs/config + @nestjs/schedule at the versions compatible with Nest 11, prisma/@prisma/client ^6.18, ioredis (Examination's major), @nestjs/throttler ^6.5 + @nest-lab/throttler-storage-redis ^1.2, @nestjs/microservices ^11 + amqp-connection-manager ^4 + amqplib, @aws-sdk/client-s3 ^3.879 (+ `@aws-sdk/s3-request-presigner`), sharp ^0.34, @nestjs-modules/mailer ^2 + nodemailer ^7 + handlebars ^4.7, passport ^0.7 + passport-jwt + passport-google-oauth20, argon2 ^0.40, otplib ^12, nestjs-i18n ^10.5, class-validator/transformer, nest-winston + winston-daily-rotate-file, jest ^29 + supertest + pactum |
| Data | Postgres 18 (prod `db` container; dev/test containers also 18 to match prod), Redis 7, RabbitMQ 3.13 |

New dependencies Examination doesn't use, each with its reason:
- `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-slug`, `rehype-autolink-headings`, `rehype-sanitize`, `@shikijs/rehype`, `rehype-stringify`: the Markdown pipeline the brief asks for (GFM, anchors, sanitising, Shiki).
- `feed`: RSS/Atom per locale, instead of hand-writing XML.
- `cmdk`: the ⌘K palette, with accessible listbox semantics included.
- `@dnd-kit/core` + `@dnd-kit/sortable`: accessible drag-and-drop reordering in the CMS.
- `@uiw/react-codemirror` + `@codemirror/lang-markdown`: the Markdown editor.
- `@playwright/test`: smoke tests (brief §8).
- `@nestjs/swagger`: dev-only OpenAPI (brief §6).
- `helmet`: security headers on the API.
- `file-type`: magic-byte upload validation (brief §6).
- `google-auth-library`: already used by Examination-api. Used to verify Google ID tokens / PKCE exchange.
- **Not added:** blurhash (sharp produces a 16px WebP LQIP data-URI instead), a transliteration package (a small az/ru → latin table, unit-tested, in `packages/config`), and any Turnstile React wrapper (a ~30-line component that loads the official script).

Left out on purpose, as the brief allows: MongoDB/Mongoose, the Python worker, payments, fingerprinting, Discord webhooks, OpenAI/Anthropic SDKs, GA4/GTM, cookie-consent banner (Cloudflare Web Analytics is cookieless, and the only cookies are strictly necessary: theme, `preferredLang`, Turnstile).

---

## 4. Environments, ports, names

| | dev (local) | test (local) | prod (VPS) |
|---|---|---|---|
| web | :5600 | Playwright against `next start` :5600 | `portfolio-web`, 127.0.0.1:4301 (blue) / :4302 (green) |
| admin | :5603 | — | `portfolio-admin`, 127.0.0.1:4311 / :4312 |
| api | :3100 | e2e in-process | `portfolio-api`, 127.0.0.1:3101 / :3102 |
| Postgres | `portfolio-db-dev` :5436 | `portfolio-db-test` :5437 | shared `db`, database `portfolio`, role `portfolio` |
| Redis | `portfolio-redis-dev` :6382 | same, DB 2 | shared `redis`, DB `1`, prefix `pf:` |
| RabbitMQ | `portfolio-rabbitmq-dev` :5673 / mgmt :15673 | same | shared `rabbitmq`, vhost `portfolio`, user `portfolio` |
| S3 | SeaweedFS S3 gateway via compose (`portfolio-s3-dev`, :9002; MinIO no longer publishes images) | mocked in e2e | private bucket `mehdisafarzade-dev-media` (name TBD, you create it) |

Env files follow Examination: `api/.env.dev`, `api/.env.test`, and `.env` on the server only; `frontend/apps/*/.env.local` for dev, with `.env.web` / `.env.admin` on the server. Every variable is listed with a description in `.env.example`. **`assertEnv.ts` is the first import in `main.ts`**, the same idea as Examination's `assertConnectionEnv`. Unlike Examination's API, it can't be tricked by a production `.env` sitting at the repo root: `api/` never has one locally, and the check also refuses to boot when `NODE_ENV!=='production'` and `DATABASE_URL` points to a non-localhost host. Frontend env is Zod-validated in `packages/config/env.ts` at build time and at boot.

---

## 5. Data model (Prisma; snake_case via `@@map`/`@map` on **every** model and field, cuid ids, `created_at`/`updated_at` everywhere)

```
enum Locale { az en ru }
enum PostStatus { DRAFT SCHEDULED PUBLISHED ARCHIVED }
enum ContentStatus { DRAFT PUBLISHED ARCHIVED }          // projects, experience, pages
enum MessageStatus { NEW READ ARCHIVED SPAM }

Post            id, status, publishedAt?, scheduledAt?, featured, coverMediaId?, authorId, needsReview
PostTranslation id, postId, locale, title, slug, excerpt, bodyMarkdown, readingTimeMin, seoTitle?, seoDescription?
                @@unique([postId, locale])  @@unique([locale, slug])
Tag / TagTranslation(name, slug) / PostTag(postId, tagId)
Project         id, slug(global, for URLs + admin), order, featured, status, repoUrl?, liveUrl?, startedAt?, endedAt?, coverMediaId?, needsReview
ProjectTranslation  title, summary, caseStudyMarkdown, role          @@unique([projectId, locale])
ProjectSkill (projectId, skillId, order)   ProjectMedia (projectId, mediaId, order)
Experience      id, org, orgUrl?, location?, startedAt, endedAt?, order, status, needsReview
ExperienceTranslation  title, summary, bulletsMarkdown
Education (same shape as Experience)         // UNEC — the brief lists it on /about
Skill           id, name, category(enum: LANGUAGE FRAMEWORK DATA CLOUD_DEVOPS TOOLING SOFT), level?, icon?, order, featured
SiteProfile     singleton (id = 'profile'): email, socials Json (validated), availableForWork, resumes → ProfileResume(locale, mediaId)
SiteProfileTranslation  name, headline, pitch, bioMarkdown, seoTitle, seoDescription
Page / PageTranslation  (slug per locale, bodyMarkdown, seo)  // e.g. /uses
Media           id, s3Key, mime, width?, height?, size, lqip?(data URI), variants Json, status(PENDING READY FAILED), uploadedById
MediaTranslation  alt, caption                    @@unique([mediaId, locale])
ContactMessage  name, email, subject?, message, budget?, projectType?, locale, status, ipHash, userAgent, repliedAt?, notifiedAt?, autoReplyAt?
AdminUser       email(unique), passwordHash, totpSecretEnc?, totpEnabledAt?, googleSub?, lastLoginAt?, disabledAt?
AdminRecoveryCode  id, adminId, codeHash(argon2), usedAt?          // 10 per enrollment, regenerated = old set deleted
AdminSession    id, adminId, deviceName, familyId, refreshHash(unique), ip?, ua?, createdAt, lastUsedAt, expiresAt, revokedAt?, replacedById?
AuditLog        id, adminId?, deviceName, action, entity, entityId?, diff Json?, ip?, at
```

- **Per-locale slug uniqueness** for posts (`@@unique([locale, slug])`) comes straight from the brief. Projects use a single global slug because case-study URLs are shared across locales. Hreflang only lists locales that have a translation.
- `needsReview` is a real column, so the admin dashboard can list seeded content that needs checking. It's cleared through the CMS.
- **The TOTP secret is encrypted at rest** (AES-256-GCM, key `TOTP_ENC_KEY` from env, versioned ciphertext prefix). Examination stores it in plaintext.
- The seed (`prisma/seed.ts`) is idempotent: it upserts by natural keys. It loads the profile, experience, education, skills, the Examination.az case study plus the legacy projects (as `DRAFT` + `needsReview`), one sample post in az/en/ru (`DRAFT`), and one admin user from `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`. The admin is created with **no TOTP**, so the first login is forced into TOTP enrollment (§8.3).

---

## 6. API surface (`/v1` in every environment)

Public (read-only; returns only `PUBLISHED` content; Redis-cached under `pf:cache:*` with tag sets `pf:tag:<tag>`; invalidated on every admin write):
`GET /v1/health` · `GET /v1/profile?locale` · `GET /v1/posts?locale&page&tag&q` · `GET /v1/posts/:slug?locale` (+ `alternates`) · `GET /v1/tags?locale` · `GET /v1/projects?locale&featured&skill` · `GET /v1/projects/:slug?locale` · `GET /v1/experience?locale` · `GET /v1/education?locale` · `GET /v1/skills` · `GET /v1/pages/:slug?locale` · `GET /v1/media/:id/:variant` (302 to a short-lived signed URL, cacheable for 5 min) · `POST /v1/contact`.

Server-to-server only (HMAC-signed with `PREVIEW_SECRET`, rejected without the signature, never linked): `GET /v1/preview/{posts|projects|pages}/:id?locale`, used by web draft mode.

Admin (`/v1/admin/*`, reachable **only** via `admin.mehdisafarzade.dev/api/*`, §8):
`auth/{login, totp/setup, totp/enable, totp/verify, refresh, logout, logout-all, me, sessions, google, google/callback}` · CRUD + `publish|unpublish|schedule|archive` for `posts`, `projects`, `experience`, `education`, `pages`; CRUD + `reorder` for `skills`, `tags`, projects, experience · `media/{presign, :id/finalize, :id (PATCH alt/caption), :id/usage, :id (DELETE → 409 if in use)}` · `messages` list/detail/status/`export.csv` · `settings/profile`, `settings/resume/:locale` · `translations/report` · `revalidate/all` · `audit` · `stats`.

Swagger at `/v1/docs` in dev only. `packages/api/types.ts` is **hand-maintained** (Examination style), and an API e2e test snapshots the OpenAPI schema so contract drift fails CI.

Async (RabbitMQ, topic exchange `pf.events`, durable queue `pf.api.events`, manual ack, DLQ `pf.api.events.dlq`): `contact.received` → notify + auto-reply; `media.uploaded` → sharp variants (AVIF/WebP at 480/960/1600 + LQIP) → `media.ready`; `content.changed` → revalidate web. Every consumer is idempotent: it checks `notifiedAt`/`autoReplyAt`/`Media.status` before acting.

Cron (`@nestjs/schedule`): every minute, publish due `SCHEDULED` posts. With two colours running during blue/green, the job takes a **Redis `SET NX PX` lock** (`pf:lock:publish-scheduled`), which avoids the double run Examination has (its `PB-15`).

---

## 7. Public web (`apps/web`)

**Routing:** next-intl, `localePrefix: 'always'`, `localeDetection: true`. `/` redirects to the `preferredLang` cookie, then `Accept-Language`, then `en`. The cookie name `preferredLang` is shared via `domain=.mehdisafarzade.dev` in production. The canonical origin is `https://www.mehdisafarzade.dev`; the apex redirects via a Cloudflare Redirect Rule, with an nginx 301 as a fallback.

**Page map:**
| Route | Rendering |
|---|---|
| `/[locale]` home: hero, selected projects (bento), experience timeline, stack, latest 3 posts, contact CTA | ISR, tags `profile, projects, posts, skills, experience` |
| `/[locale]/projects`, `/[locale]/projects/[slug]` | ISR; filter by skill in the query string (server-side) |
| `/[locale]/blog`, `/[locale]/blog/[slug]`, `/[locale]/blog/tag/[tag]` | ISR; search is `?q` → API (Postgres `ILIKE` on title/excerpt; FTS later if needed) |
| `/[locale]/about`, `/[locale]/contact`, `/[locale]/uses` (CMS page) | ISR / contact form is a client island |
| `/[locale]/feed.xml`, `sitemap.ts`, `robots.ts`, `opengraph-image` per route | route handlers |
| `/api/revalidate` (HMAC), `/api/draft` (signed enable), `/api/draft/disable` | route handlers, `dynamic` |
| `/_design` | dev-only style tile (404 in production builds) |

**Revalidation:** the API calls **both colours** (`http://portfolio-web-blue:3000`, `http://portfolio-web-green:3000`) over the Docker network, with an HMAC over `timestamp.body` and a 5-minute replay window. Each colour has its own ISR cache, and the standby colour must be warm for rollback. A failure on a stopped colour is logged at debug. `revalidate: 3600` is the time-based fallback. HTML is **not** cached at the Cloudflare edge, so no Cloudflare purge (and no Cloudflare API token) is needed.

**Missing translations:** the page renders with `en` content, shows a small localized notice, sets `<link rel=canonical>` to the `en` URL, and emits `hreflang` only for existing locales.

**Résumé button:** shown only when `ProfileResume[locale]` exists. There's no cross-locale fallback.

**Contact form:** RHF + Zod, with the schema in `packages/config/schemas/contact.ts` and mirrored by the API DTO. A shared test fixture runs both against the same valid/invalid cases so they can't drift apart. Fields: name, email, subject?, message, projectType? (select), budget? (select), honeypot `website`, `startedAt` (signed by the server when the form renders, so a bot can't fake it). Turnstile runs in managed mode and the API verifies it via `siteverify`, including hostname and action checks. Limits: per IP-hash 3/10 min and 10/day, per email 3/day, all in Redis. The IP is stored only as an HMAC-SHA256 with `IP_HASH_PEPPER`. The API returns 202 once the row is saved and `contact.received` is published; email is sent later by the consumer.

**Theme:** a `theme` cookie plus an inline `<script>` in `<head>` that sets `data-theme` before paint, the same pattern as Examination's `themeServer`/`themeClient`. The `system` setting follows `prefers-color-scheme`.

**SEO:** `generateMetadata` on every page, `alternates.languages`, JSON-LD (`Person` + `WebSite` on home, `BlogPosting`, `BreadcrumbList`), `next/og` images.

**Analytics:** the Cloudflare Web Analytics beacon is injected only when `NODE_ENV=production && NEXT_PUBLIC_CF_BEACON_TOKEN` is set, in `apps/web` only. The CSP allows `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (connect).

**CSP (web):** nonce-based via `proxy.ts`. It allows `challenges.cloudflare.com` (Turnstile script/frame), the analytics hosts, and `api.mehdisafarzade.dev` (connect). Also HSTS (nginx), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'`.

### Design direction (to be shown as `/_design` before any page is built, Phase 5 ☑)
- **Type:** a variable display serif for headlines (candidate: *Fraunces* or *Instrument Serif*), *Inter* variable for UI/body (continuity with Examination), and *JetBrains Mono* for code and small labels. All via `next/font`, subset latin + latin-ext + cyrillic (az + ru).
- **Palette:** a neutral base (warm greys, near-black `#0E0E10` in dark mode) with **one** accent. Candidate: electric vermilion or acid-lime, picked on the tile against AA contrast in both themes. Colours are CSS custom properties, exposed as SCSS `$color-*` tokens and Tailwind theme values (the `@examination/ui/styles` chain).
- **Layout:** a 12-column grid, bento cards for projects and skills, generous vertical rhythm, oversized section numerals, mono micro-labels.
- **Motion:** framer-motion reveals (opacity + 8px translate, 200–300 ms) and view-transition-style page fades. Everything is wrapped in a `useReducedMotion` gate. No scroll-jacking.
- **Performance budget:** Lighthouse ≥ 95 (all four, mobile), LCP < 2.0s, CLS < 0.05. Server components by default. Client islands only for theme toggle, language switcher, ⌘K palette (lazy), contact form, gallery lightbox.

---

## 8. Admin: device gate + admin auth (change 2)

### 8.1 Request flow

```
Browser (my PC / laptop)                           Cloudflare (proxied, cache BYPASS for admin.*)
   │  https://admin.mehdisafarzade.dev/...                 │  AOP client cert to origin
   └──────────────────────────────────────────────────────►│
                                                           ▼
nginx  server admin.mehdisafarzade.dev  (ssl_verify_client on)
   │ 1. $dg_device = map("$host:" + token from __Host-dg cookie)     (conf.d/device-gate.conf)
   │ 2. if ($dg_device = "") { return 404; }   ← server-level, before every location, incl /_next/* and /api/*
   │    (exception: location = /__dg/unlock, which is itself 404 unless an unlock key is live)
   │
   ├── location /api/  ──►  proxy_pass http://127.0.0.1:310x/v1/admin/   (portfolio-api, active colour)
   │                         proxy_set_header X-Admin-Device $dg_device;  (overwrites any client value)
   │                         Cookie passes through → API sets __Host-pf_* cookies on the admin host
   │
   └── location /       ──►  proxy_pass http://127.0.0.1:431x             (portfolio-admin Next app)
                             proxy_set_header X-Admin-Device $dg_device;
                             Admin SSR → http://portfolio-api:3000/v1/admin/* over the "portfolio" network,
                             forwarding the Cookie + X-Admin-Device it received.

nginx  server api.mehdisafarzade.dev
   ├── location ~* ^/v1/admin  { return 404; }     ← case-insensitive, see risk R2
   └── location /              proxy_set_header X-Admin-Device "";   (cleared, can't be spoofed)
```

nginx runs on the host, so "over the Docker network" means the loopback-published colour port for nginx → container. Only the admin app's own SSR calls go container-to-container.

### 8.2 The gate (nginx)
- **Why regex on `$http_cookie`:** an nginx variable name can't contain `-`, so `$cookie___Host-dg` doesn't work. `conf.d/device-gate.conf`:
  ```nginx
  map $http_cookie $dg_token { default ""; "~(?:^|;\s*)__Host-dg=(?<t>[A-Za-z0-9_-]{43})(?:;|$)" $t; }
  map "$host:$dg_token" $dg_device { default ""; include /etc/nginx/device-gate/*.map; }     # "<host>:<token>" <device>;
  map "$host:$arg_k"    $dg_unlock { default ""; include /etc/nginx/device-gate/*.unlock; }  # "<host>:<key>"  <token>;
  limit_req_zone $binary_remote_addr zone=dg_unlock:1m rate=6r/m;
  ```
  Keying the maps on `$host` makes the whole thing **generic**. `examination-admin` later only needs its own `admin.examination.az.map`, plus `include snippets/device-gate.conf;` in its server block. The `*.map`/`*.unlock` globs match zero files cleanly.
- `snippets/device-gate.conf` (included in the admin `server {}`). The server-level `if` runs in the server rewrite phase, **before** location matching, so a browser that isn't enrolled yet would be turned away from the unlock URL too. The unlock path is therefore exempted explicitly:
  ```nginx
  set $dg_ok $dg_device;
  if ($uri = /__dg/unlock) { set $dg_ok "unlock"; }
  if ($dg_ok = "") { return 404; }                 # every other path, incl. /_next/* and /api/*

  location = /__dg/unlock {
      access_log off;  limit_req zone=dg_unlock burst=3 nodelay;
      if ($dg_unlock = "") { return 404; }         # no live unlock key → indistinguishable from any 404
      add_header Set-Cookie "__Host-dg=$dg_unlock; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax" always;
      add_header Cache-Control "no-store" always;
      return 302 /;
  }
  add_header Cache-Control "private, no-store" always;
  ```
  The harness in §10.4 tests this exact ordering.
- **Found by the harness (Phase 3):** (1) `map_hash_bucket_size 128;` is required in `conf.d/device-gate.conf` (the `host:token` keys exceed the 64-byte default and nginx refuses to load; the live `nginx.conf` doesn't set it, checked with `nginx -T`). (2) The unlock redirect uses `absolute_redirect off` so it works on non-443 ports. (3) Keep `device-gate.conf` loading before any server that includes the snippet (it defines the `dg_enroll` log format).
- **Local dev gate:** `deploy/nginx/dev/` runs the same two files in nginx:1.24 on `https://localhost:8443` (plain `localhost` because Google OAuth accepts only `localhost` as a non-public redirect host). `gate.ps1 -Target local` manages it.
- The **404 body** is nginx's default 404 page, the same as any unknown path, so it gives nothing away. `server_tokens off` is already global (verify in Phase 9).
- **File permissions:** `/etc/nginx/device-gate/` is `0700 root`, and files are `0600 root`. The nginx master reads includes as root, so that's fine.

### 8.3 Admin auth (behind the gate)

Mirrors `examination-api/src/api/admin/auth/*` (argon2, otplib, `AdminOtpLockoutService`, pending-token step, Google realm), with the improvements agreed in Phase 0.

Password flow:
1. `POST /api/auth/login {email, password}` → argon2 verify (constant-time dummy hash when the email is unknown).
   - TOTP enabled → `200 {step:"totp"}` + `__Host-pf_pending` (httpOnly, Strict, 5 min, JWT `purpose=verify`).
   - TOTP **not yet enabled** → `200 {step:"totp-setup"}` + pending cookie `purpose=setup`. **No session is issued before TOTP is enrolled.** (Examination issues a full session here; see Q1.)
2. `POST /api/auth/totp/verify {code}` (a 6-digit TOTP **or** an unused recovery code, which is then marked used and audited), or `totp/setup` + `totp/enable` during enrollment. `enable` returns the 10 recovery codes **once**, and only then is a session issued. Lockout check first (per admin, 5 failures in 15 min → 15 min lock, **copied from `ADMIN_OTP_LOCKOUT`**) → session.
3. Session = access JWT (`__Host-pf_at`, 10 min, `sub`, `sid`, `dev`) + refresh token (`__Host-pf_rt`, opaque 256-bit, 14 days sliding, **rotated on every use** with reuse detection: presenting a replaced token revokes the whole `familyId`). Both are httpOnly, Secure, `SameSite=Strict`, `Path=/`, host-only on the admin host.
4. **Device binding:** `AdminSession.deviceName` = `X-Admin-Device` at login. Refresh and every guarded request must present the same device, otherwise 401 and the session is revoked. A token stolen from the laptop is useless when replayed as `pc`.

Google flow (callback on the admin host, so it goes through the gate):
- `GET /api/auth/google` → state + PKCE verifier in `__Host-pf_oauth` (httpOnly, **Lax**, 10 min, because the callback is a cross-site navigation) → Google.
- `GET /api/auth/google/callback` → verify state/PKCE, `email_verified === true`, **email ∈ `ADMIN_GOOGLE_ALLOWLIST` (env) AND matches an existing, active `AdminUser`**. No auto-provisioning. Links `googleSub` on first use, and after that the `sub` must match. An admin without TOTP enrolled who signs in with Google is sent into the same forced enrollment.
- Then the **same TOTP step** as password login (Examination does this too once OTP is verified). Examination passes the pending token in the redirect query string (`?pending=…`). Here it goes in the `__Host-pf_pending` cookie instead.
- **SameSite=Strict pitfall:** cookies set in the callback aren't sent on a redirect chain that started cross-site (from accounts.google.com). So the callback answers with a tiny same-origin HTML page (meta refresh to `/login/totp`, CSP-hashed) instead of a 302. That makes the next navigation same-site.

CSRF on cookie-authed mutations: (a) `SameSite=Strict`, (b) the API rejects any non-GET under `/v1/admin` whose `Origin` (falling back to `Sec-Fetch-Site`) isn't the admin origin, and (c) a double-submit token (`__Host-pf_csrf`, readable by JS, echoed in `X-CSRF-Token`). (b) and (c) are both enforced; each is cheap.

Guards (opt-in per controller, Examination style, **plus a CI test**): `AdminDeviceGuard` (non-empty `X-Admin-Device`) → `AdminJwtGuard` (Passport strategy `admin-jwt` reading the cookie, checks `sid` not revoked through a Redis-cached session lookup) → `AdminCsrfGuard`. They're composed in one `@AdminAuth()` decorator. An e2e test enumerates **every route under `/v1/admin` from Nest's router** and checks: anonymous → 401/404, no device header → 401, a valid token without the device header → 401. Adding a controller without the decorator fails CI.

`AuditLog` records the admin, device, action, entity, id, diff (redacted fields: passwords, tokens, secrets), IP and time for every mutation, via an interceptor on `@AdminAuth()` controllers.

Admin UI routes: `/login`, `/login/totp`, `/login/totp-setup` (QR from `otpauth://`, rendered client-side with `qrcode.react`, the same package as Examination admin). `src/proxy.ts` redirects to `/login` when there's no `__Host-pf_at`/`__Host-pf_rt` cookie. Session expiry: fetches go through a wrapper that retries once after `POST /api/auth/refresh`, then redirects to `/login?next=`.

### 8.4 `gate.ps1` (PowerShell, runs on Windows, you run it)

`enroll | revoke | list | rotate` with `-Site <name> -Device <name> [-PrintUrl]`. Site definitions live in `deploy/device-gate/sites.psd1` (committed): `portfolio-admin → host admin.mehdisafarzade.dev, map /etc/nginx/device-gate/admin.mehdisafarzade.dev.map`; `examination-admin` gets added later.

What `enroll` does:
1. Generate a token (32 random bytes → base64url, 43 chars) and an unlock key (32 bytes) locally with `RandomNumberGenerator`.
2. Over **one** `ssh root@examination` session, with values sent on **stdin** (never argv, so they can't be seen in `ps`): back up the map and unlock files, append `"host:token" device;` and `"host:key" token;`, run `nginx -t`, reload. On failure, restore the backup and `nginx -t && reload`.
3. `Start-Process https://admin…/__dg/unlock?k=<key>`, or print the URL with `-PrintUrl`.
4. Poll for up to 120 s (or until Enter) until nginx shows a gate-passing request from that device (the script checks a device-specific ping: `curl` with the cookie from the server itself against `127.0.0.1` + `Host` header, which confirms the map entry works). Then remove the unlock line, `nginx -t`, reload.
5. Store `{site, device, enrolledAt}` in `.local/devices.json` (no token).

`revoke` removes that device's line. `list` shows device names from the server map with the file's line metadata, **stripping tokens server-side before anything crosses SSH** (`awk` prints field 2 only). `rotate` is revoke + enroll. The map files never get `cat`'d to the terminal. The README covers enrollment, cleared cookies / other browser profiles / incognito (each profile is its own device, so re-enroll), a lost laptop (`revoke` from the PC), and adding another site.

---

## 9. Infrastructure

### 9.1 VPS layout
```
/apps/mehdisafarzade.dev/api/        docker-compose*.yml, deploy/rollback-api.sh, .env        (local git repo, drift receipts)
/apps/mehdisafarzade.dev/frontend/   docker-compose*.yml, deploy/rollback-frontend.sh, .env.web, .env.admin
/etc/nginx/sites-enabled/portfolio.conf          (via Examination/VPS/deploy-nginx.sh)
/etc/nginx/conf.d/device-gate.conf, snippets/device-gate.conf
/etc/nginx/upstreams/portfolio_{api,web,admin}_targets.conf   (CI-generated after the first manual creation)
/etc/nginx/device-gate/*.map|*.unlock            (root 0700/0600, written only by gate.ps1)
/etc/ssl/cloudflare/mehdisafarzade.dev.{pem,key}
```

### 9.2 Docker networks
- `backend` (existing, external): **only `portfolio-api`** joins it, for `db`/`redis`/`rabbitmq`.
- `portfolio` (new, external, created once): `portfolio-api`, `portfolio-web-{blue,green}`, `portfolio-admin-{blue,green}`. The web and admin containers **don't** join `backend`, so they can't reach Examination or the shared data services at all.
- Aliases: each api colour has a colour-specific alias (`portfolio-api-blue` / `-green`). The stable alias `portfolio-api`, which web/admin use as `INTERNAL_API_URL=http://portfolio-api:3000`, belongs to the **active** colour only. After the nginx flip, the deploy script moves it (`docker network disconnect` + `connect --alias portfolio-api`). Phase 9 proves this before we rely on it. The fallback is for web/admin to call the API through nginx on the host gateway.

### 9.3 Images and CI (GHCR)
- `ghcr.io/seonervortex/mehdisafarzade.dev-api:<sha>` (+ `:cache`).
- `ghcr.io/seonervortex/mehdisafarzade.dev-frontend:web-<sha>` and `:admin-<sha>` (+ `:cache-web`, `:cache-admin`).
- **Tag-aware retention** (`.github/workflows/ghcr-retention.yml`, weekly + manual, `dry-run` input that defaults to true on the first runs):
  1. **Deploy state = GitHub Deployments**, not git tags (no force-updated refs in the repo). Each deploy workflow creates a Deployment in environment `production-web` / `production-admin` / `production-api` with `ref=<sha>` and marks it `success` only after the nginx flip. The rollback scripts report their flip back the same way (a `workflow_dispatch` "record-rollback" run, or it's reconciled on the next deploy).
  2. The retention job reads the **last 2 successful deployments per environment** (current + previous = the running colour and the rollback colour) and builds a `skip-tags` list: `web-<sha>`, `admin-<sha>`, `<sha>` (api), plus `cache-*`.
  3. It runs `snok/container-retention-policy` (v3) **once per prefix** (`image-tags: web-*`, then `admin-*`) with `keep-n-most-recent: 10`, `cut-off: 4w`, and the `skip-tags` list. Then once for the api package.
  4. Safety net: if the Deployments lookup returns fewer than 2 successful entries for any environment, the job **fails without deleting anything**. As a second guard, before deleting, a read-only SSH check (`grep` of the live upstream files + `docker ps --format '{{.Image}}'` on the server, via a restricted-command deploy key) confirms that no running image is on the delete list.
  5. The exact snok v3 option names are checked against its README when this is built (Phase 9). If prefix filtering proves unreliable there, the fallback is to split into `-web`/`-admin` packages, and I'll tell you why.
- `ci.yml`: on PRs and pushes to `v2`, path-filtered; runs `yarn ci` in `frontend/` (typecheck, lint, test, i18n:check) and `yarn ci` in `api/` (build, lint, unit, e2e against a Postgres/Redis/RabbitMQ service container).
- `deploy-*.yml`: the same shape as Examination (Buildx + GHCR registry cache, scp compose + rollback, SSH deploy that reads the live upstream file to pick the inactive colour → `prisma migrate deploy` (api only) → up `--wait` → curl health on the inactive port → rewrite the upstream → `nginx -t` → reload → leave the old colour running → git-commit the deploy receipt). **Separate concurrency groups** from Examination's `production-deploy`. Pre-flight probes for `db`/`redis`/`rabbitmq` health, the same as Examination.
- The frontend deploy handles **web and admin as two independent blue/green services**, each with its own upstream file and colour, and only rebuilds the app whose inputs changed (turbo `--filter=...[origin/main~1]`), so an admin-only change doesn't redeploy web.

### 9.4 nginx (`deploy/nginx/sites-enabled/portfolio.conf`)
- Port 80: every host → 301 https. Apex → `https://www.mehdisafarzade.dev$request_uri`.
- 443 servers for `www`, apex (301), `api`, `admin`: Cloudflare origin cert, `ssl_client_certificate cf-origin-pull-ca.pem` + `ssl_verify_client on` on **every** vhost, `listen 443 ssl http2`, gzip (already global), `/_next/static/` 1y immutable on www/admin, `Connection ""`, the same proxy headers as `examination.conf`.
- api: `location = /health { allow 127.0.0.1; deny all; }`, `location ~* ^/v1/admin { return 404; }`, `location = /v1/contact` with a `limit_req` zone (`pf_contact`, 10r/m burst 5), `client_max_body_size 1m` (uploads go straight to S3 via a presigned PUT, so the API never receives large bodies).
- admin: the gate snippet, `/api/` → api upstream `/v1/admin/`, `/` → admin upstream, `limit_req` on `/api/auth/` (`pf_admin_auth`, 30r/m burst 5).
- New `limit_req_zone`s go in `conf.d/portfolio.conf` (http level), so `nginx.conf` isn't edited at all.

### 9.5 Shared-infra changes (proposed, not run: each needs your OK with the exact commands)
1. Postgres: `CREATE ROLE portfolio LOGIN PASSWORD '<you set>' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS; CREATE DATABASE portfolio OWNER portfolio; REVOKE ALL ON DATABASE portfolio FROM PUBLIC;`. On Postgres 15+ the `public` schema is owned by `pg_database_owner`, so the DB owner can run every DDL Prisma migrations need. **No `portfolio_migrator` role is needed**: `prisma migrate deploy` doesn't use a shadow DB. (`prisma migrate dev` does, but that only ever runs against the local dev container.) Examination's `REVOKE CONNECT ON DATABASE examination FROM PUBLIC` is recorded as your decision to make separately, and is not part of our change list.
2. RabbitMQ: `rabbitmqctl add_vhost portfolio; add_user portfolio <pw>; set_permissions -p portfolio portfolio ".*" ".*" ".*"` (no tags).
3. Redis: nothing to create. DB 1 + `pf:` prefix. The ACL option is in R6.
4. `docker network create portfolio`.
5. Directories, cert/key placement, initial upstream files, and the device-gate dir.

### 9.6 Per-hostname Authenticated Origin Pulls (closes R1 for the portfolio)
Zone-level AOP uses Cloudflare's shared client cert, so *any* Cloudflare zone pointed at our IP passes it. Per-hostname AOP makes Cloudflare present **our own** client certificate for `www`, apex, `api` and `admin` (all plans, Free included). nginx then trusts **only our private CA** in those four server blocks. Examination's vhosts keep `cf-origin-pull-ca.pem`, since nginx picks the server block, and with it `ssl_client_certificate`, by SNI.
- **PKI:** an offline private CA (EC P-256, 10 y; the key stays on your PC, never on the server or in the repo) signs one **leaf client cert** (EC P-256, 1 y, `extendedKeyUsage=clientAuth`). The leaf + its key are uploaded to Cloudflare (Cloudflare requires a leaf, not a CA). nginx gets **only the CA cert** (`/etc/ssl/cloudflare/mehdisafarzade.dev-aop-ca.pem`). Rotation means a new leaf from the same CA, with no nginx change.
- **API** (token scoped to *this zone only*, permission **Zone → SSL and Certificates → Edit**, short TTL, deleted after setup):
  `POST /zones/{zone_id}/origin_tls_client_auth/hostnames/certificates` `{certificate, private_key}` → `cert_id`. Then
  `PUT /zones/{zone_id}/origin_tls_client_auth/hostnames` `{"config":[{"hostname":"www.mehdisafarzade.dev","cert_id":"…","enabled":true}, …apex, api, admin, and the temporary v2 hosts]}`, and
  `GET /zones/{zone_id}/origin_tls_client_auth/hostnames/{hostname}` to confirm `status: active`.
- **Rollout with no lockout window:** (1) nginx trusts a **bundle** of our CA + `cf-origin-pull-ca.pem` → (2) enable per-hostname in Cloudflare → (3) confirm from the nginx log that the presented cert is ours (`$ssl_client_s_dn` logged temporarily) → (4) nginx trusts only our CA → (5) test from a *different* Cloudflare zone (or `curl` with the Cloudflare shared cert) → 400 "No required SSL certificate".
- **Rollback:** point `ssl_client_certificate` back at the bundle (or `cf-origin-pull-ca.pem`), `nginx -t`, reload. Then `PUT … enabled:false` per hostname.
- **Expiry:** the leaf expiry date goes in `DEPLOY.md`, plus a 30-day reminder. An expired leaf means Cloudflare's handshake fails → 526/525 for the site, so the renewal runbook is the same as rotation.

---

## 10. VPS-mirror (`D:\Files\Examination\VPS`) changes, proposed as an exact diff for your approval (Phase 9)

1. Add `nginx/sites-enabled/portfolio.conf`, `nginx/conf.d/device-gate.conf`, `nginx/conf.d/portfolio.conf`, `nginx/snippets/device-gate.conf` (copied from our `deploy/nginx/`; our repo is the source).
2. `deploy-nginx.sh`: also back up / copy / restore `conf.d/*.conf` and `snippets/device-gate.conf`. **An explicit comment and guard: never touch `/etc/nginx/device-gate/`.**
3. `check-drift.sh`: diff `conf.d/*.conf` and `snippets/device-gate.conf` too, and explicitly skip `device-gate/` and the CI-generated `upstreams/portfolio_*`.
4. `.gitignore` in the VPS mirror: `nginx/device-gate/`, `*.map`, `*.unlock`.

### 10.4 Gate test harness (`deploy/nginx/test/run.sh`, Phase 3/9)
It runs `nginx:1.24` in Docker with our `conf.d`/`snippets`/`sites-enabled` files, a self-signed cert (AOP disabled only in the test overlay), stub upstreams (`hashicorp/http-echo`, echoing the received `X-Admin-Device`), and a throwaway map. It asserts: no cookie → 404; a wrong cookie → 404; a valid cookie → 200 and the upstream sees `X-Admin-Device: pc`; a client-sent `X-Admin-Device: laptop` is overwritten; `/__dg/unlock?k=<live>` → 302 + `Set-Cookie`; the same key after removal → 404; `/_next/static/x` and `/api/x` without a cookie → 404; the api vhost `/v1/admin/x`, `/V1/Admin/x`, `/v1//admin/x`, `/v1/%61dmin/x` → 404; api vhost `X-Admin-Device` spoofing → cleared. It runs in `ci.yml`.

---

## 11. Admin CMS (`apps/admin`)

A dense, clean UI on `@portfolio/ui` tokens, dark mode, en + az. `next-intl` **without** a URL prefix (cookie-based, the same as Examination's `app`). Screens: dashboard (unread messages, draft/scheduled/published counts, recent audit entries, missing translations, `needsReview` items), posts (table + editor: locale tabs with completeness badges, CodeMirror + live preview through `@portfolio/markdown`, media picker, autosave to `localStorage` + a server draft every 10 s, slug generation with az/ru transliteration, SEO with a SERP/OG preview, tags, cover, publish/schedule/unpublish, "Preview on site"), projects / experience / education / skills / pages / tags (CRUD + dnd-kit reordering), media library (drag-and-drop upload → presigned PUT → finalize, per-locale alt, usage view, delete blocked while in use), messages (list/detail, status, `mailto:` reply, CSV export), settings (profile, socials, availability, per-locale résumé, revalidate-all), audit log, sessions (list and revoke own sessions per device). Shortcuts: ⌘S save, ⌘K jump, ⌘Enter publish. Every response sends `Cache-Control: private, no-store`, as nginx also does.

---

## 12. Email (SES)

Nodemailer SES transport (Examination's mailer pattern + Handlebars templates in `src/common/helpers/mailer/templates/{az,en,ru}/`). From: `Mehdi Safarzade <no-reply@mehdisafarzade.dev>`. The notification goes to `contact@mehdisafarzade.dev` with `Reply-To: <visitor>`. The auto-reply goes to the visitor in the locale they submitted in, with `Reply-To: contact@mehdisafarzade.dev`. Visitor-supplied text is escaped by Handlebars and header values are stripped of CR/LF. SES needs production access (out of sandbox) on your AWS account; that goes in `DEPLOY.md`. The DNS records are in the Cloudflare checklist (§14).

---

## 13. Cutover (goes into `DEPLOY.md` in Phase 9)

0. **Before the first push of `v2`: disconnect Vercel's Git integration** (or set an Ignored Build Step to `exit 0`). Otherwise every push to `v2` triggers a failing Preview build, because there's no root `package.json`. I'll remind you before I push anything.
1. Prepare the server (the §9.5 items, each shown to you first) and deploy both stacks while Vercel still serves production.
2. Verify. Note that `curl --resolve …:443:<ip>` from outside **can't pass AOP** (the origin requires Cloudflare's client cert), so it only works from the VPS itself against `127.0.0.1` colour ports. End-to-end verification uses **temporary proxied hostnames** `v2`, `v2-api`, `v2-admin` (added to the vhosts' `server_name`, and removed afterwards). Check the gate (404 without the cookie, the panel with it), contact round-trip, Turnstile, OG images, sitemap, feeds, hreflang, analytics beacon.
3. Lower the TTLs of the Vercel records (proxied records are "Auto", so this mainly concerns any DNS-only leftovers), then switch `www`, apex, `api`, `admin` to proxied A records → VPS IP, and remove the Vercel records.
4. Re-run the checks on the real hosts. Watch the logs for 24 h.
5. Keep the Vercel project deployable for 48 h as a rollback (switching DNS back is the rollback). Then remove the domain from Vercel and delete the project.

---

## 14. `CLOUDFLARE.md` (written in Phase 9; outline agreed now)

Ordered: (1) SSL/TLS → Full (strict), create an Origin Certificate for `mehdisafarzade.dev, *.mehdisafarzade.dev` (RSA, 15 y), install it at `/etc/ssl/cloudflare/mehdisafarzade.dev.{pem,key}`, Authenticated Origin Pulls zone-level on (the fallback), then **per-hostname AOP exactly as in §9.6** (openssl commands for the CA + leaf, the scoped token, the three API calls with `curl`, the staged nginx rollout, rollback), min TLS 1.2, TLS 1.3 on, Always Use HTTPS, Automatic HTTPS Rewrites, HSTS (max-age 6 months → 1 year, includeSubDomains once every subdomain is confirmed on HTTPS, **no preload** until you've read the warning). (2) DNS, all **proxied**: `@`, `www`, `api`, `admin` (+ temporary `v2`). Remove `76.76.21.21` / `cname.vercel-dns.com` and list any other stale records. SES: 3 DKIM CNAMEs (DNS-only is correct for these; they don't point at the origin), custom MAIL FROM `mail.mehdisafarzade.dev` MX `feedback-smtp.<region>.amazonses.com` + TXT `v=spf1 include:amazonses.com ~all`, apex SPF merged with any existing record, `_dmarc` `v=DMARC1; p=none; rua=mailto:<you>` → quarantine after 2–4 weeks of clean reports → reject. (3) A Redirect Rule for apex → `https://www.mehdisafarzade.dev${path}?${query}` (301). (4) Security: Bot Fight Mode can stay off (the free tier challenges without regard to path, and while revalidation is container-to-container so it's unaffected, the contact form's cross-origin `fetch` to `api.` could be challenged; Turnstile + rate limits already cover it), a WAF rate-limit rule (the one free slot) on `POST api.mehdisafarzade.dev/v1/contact`, a Turnstile widget (hostnames `www.mehdisafarzade.dev`, `mehdisafarzade.dev`, `v2.mehdisafarzade.dev`, `localhost` for dev; site key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, secret → API `TURNSTILE_SECRET_KEY`), Security Level default. (5) Cache Rules: **admin.* bypass (required)**, api.* bypass, `www` `/_next/static/*` cache everything with 1 y edge TTL, everything else respects origin (HTML isn't edge-cached, so no purge token is needed). (6) Web Analytics on `www` only → `NEXT_PUBLIC_CF_BEACON_TOKEN`. (7) API tokens: **one, temporary**: the per-hostname AOP token (Zone → SSL and Certificates → Edit, this zone only, expires in 1 day). No cache-purge token.

---

## 15. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | **Zone-level AOP only proves "this is Cloudflare", not "this is my zone".** | **Per-hostname AOP with our own CA (§9.6)** for all portfolio hosts. The device gate + admin auth stay as independent layers. |
| R2 | Express routing is **case-insensitive** by default, so `/V1/Admin/...` on the api vhost would miss a case-sensitive nginx `location` and reach admin routes. | A case-insensitive nginx regex, `app.set('case sensitive routing', true)` in Nest, `AdminDeviceGuard` as defense in depth, and harness cases for it (§10.4). |
| R3 | Blue/green: a moving `portfolio-api` alias, ISR caches per colour, cron running twice. | Alias reattach proven in Phase 9 (with a fallback), revalidation hits both colours, Redis lock on cron. |
| R4 | Examination F1 (ports on 0.0.0.0) makes a future gate on `examination-admin` bypassable. | Out of scope here, reported. Must be fixed before the gate is reused there. |
| R5 | `gate.ps1` runs as root on production. | Single SSH session, stdin-only secrets, backup → `nginx -t` → reload → auto-restore, and the harness mirrors every edit it makes. You run it, not me. |
| R6 | Portfolio holds the **shared** Redis password, so a portfolio compromise can reach Examination's rate-limit and claim keys. | Accepted per answer 3 for now. Recommended hardening: a Redis ACL user `portfolio` limited to `~pf:*`/`&pf:*` via an `aclfile`. That needs one Redis restart (Examination's limiter fails open and its KapitalBank claim fails closed for a few seconds), so it goes in a window you choose. |
| R7 | Seeded content presented as current. | Everything from legacy is `needsReview`; legacy-only projects are seeded as `DRAFT` (unpublished), not live. |
| R8 | SES sandbox / DNS propagation delay the contact round-trip at cutover. | Request SES production access and verify the domain in Phase 8, well before Phase 9. |
| R9 | Lighthouse ≥ 95 vs Shiki / fonts / motion. | Shiki runs at build/ISR time only (no client JS), fonts are subset + `display: swap`, and motion is lazy-loaded (`LazyMotion` + `domAnimation`). |

---

## 16. Phases (updated)

| # | Phase | Done when |
|---|---|---|
| 0 | Read, ask, plan, VPS read-only inspection | ☑ you approve this plan + answer §17 |
| 1 | Move the legacy site to `legacy/`. Scaffold `frontend/` (Yarn 4 + Turbo, packages, two empty apps) and `api/` (Nest 11 skeleton). Shared configs, dev compose (`portfolio-*` containers/ports), root + per-folder `CLAUDE.md`/`AGENTS.md`, `ci.yml`, `.gitignore` rules for maps/.local | `yarn ci` green in both |
| 2 | API foundation: `assertEnv`, envelope/interceptor/filter, nestjs-i18n (az/en/ru), Prisma schema + first migration + idempotent seed, Redis, RMQ, S3, mailer, logger, health, throttler | migrate + seed run; e2e health passes |
| 3 | Admin auth realm (password, forced TOTP enrollment + recovery codes, Google, refresh rotation, device binding, CSRF, lockout, audit) + route-enumerating guard e2e. `deploy/nginx` gate files + **gate test harness** + `gate.ps1` (with `-Target local`) + README. A **local gate container** (`portfolio-gate-dev`, nginx 1.24, same snippet/maps) fronts the dev admin app + API | ☑ you run the stack locally, enroll your browser through the local gate with `gate.ps1 enroll -Target local`, and log in to a bare admin shell with password + TOTP (+ Google if configured) |
| 4 | Content APIs, public + admin, media pipeline, scheduling (with lock), revalidation webhook, preview endpoints | e2e for CRUD + publish rules |
| 5 | Design system + `/_design`, i18n routing, theme, web layout shell | ☑ you approve the look |
| 6 | Web pages, SEO, OG, sitemap/feeds, ⌘K, Turnstile widget, analytics beacon | Lighthouse ≥ 95 locally; Playwright smoke green |
| 7 | Admin CMS screens + draft preview | ☑ trilingual post end to end |
| 8 | Contact pipeline end to end (RMQ → SES, localized), anti-spam, inbox | round-trip in dev (SES sandbox with verified addresses) |
| 9 | Dockerfiles, compose (127.0.0.1-only, CI-checked), deploy workflows, rollback scripts, nginx files + proposed VPS-mirror diff, `DEPLOY.md`, `CLOUDFLARE.md`, the §9.5 command list | ☑ you review before **any** server change or deploy |
| 10 | Delete `legacy/`, resolve `SEED_REVIEW.md` with you, final docs | `v2` ready to merge (you say when) |

Commits: conventional, one or more per phase, on `v2`, local until you approve a push (and Vercel is disconnected first).

---

## 17. Open questions

All Phase 0 questions are resolved; see §0.
