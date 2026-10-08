# CLAUDE.md: frontend

Yarn 4 + Turbo workspace. It mirrors `D:\Files\Examination\examination` (read-only reference) except where `PLAN.md` §0 says otherwise.

## Workspaces

| Workspace | Purpose |
|---|---|
| `apps/web` (`@portfolio/web`, :5600) | Public site. next-intl with **always-prefixed** locales (`/en`, `/az`, `/ru`); `/` resolves the `preferredLang` cookie → `Accept-Language` → `en`. |
| `apps/admin` (`@portfolio/admin`, :5603) | CMS. No locale in the URL (host-only `adminLang` cookie, en/az). Every response is `Cache-Control: private, no-store`. Browser API calls go to same-origin `/api` (nginx gate → `/v1/admin/*`). |
| `packages/api` | `fetchJSON`/`apiRequest`/`APIError` (Examination envelope), `apiPaths`, types, React Query defaults, `applyApiErrorsToForm`. Admin-only paths are in the separate `@portfolio/api/admin` entry. |
| `packages/i18n` | `LOCALES`, `ADMIN_LOCALES`, cookie names, message loaders (`en` fallback + requested locale), `locales/{global,web,admin}/*.json`, `scripts/check.mjs` (`yarn i18n:check`). |
| `packages/ui` | `styles/` (token chain, same structure as `@examination/ui/styles`), `Providers`, `cn`. |
| `packages/config` | Zod-validated shared env (`API_URL`, `INTERNAL_API_URL`), `parseEnv`, constants, and the shared ESLint flat config (`@portfolio/config/eslint`). |
| `packages/types` | Ambient declarations. |

## Admin app auth (Phase 3)

- `src/proxy.ts`: `/login*` is public. A live `__Host-pf_at` → continue. An expired/expiring access token plus a `__Host-pf_rt` → **server-side refresh** (POST to the API with the refresh cookie, `X-Admin-Device`, and `Origin: ADMIN_URL`; the new cookies go to both this render and the browser). Otherwise → `/login?next=`.
- Browser calls: `lib/adminClient.ts` `adminFetch()` → same-origin `/api`, CSRF header on mutations, single-flight refresh + one retry on 401.
- Server calls: `lib/getServerAdmin.ts` (`server-only`) → `INTERNAL_API_URL/admin/*`, forwarding the cookies + `x-admin-device` that nginx set.
- Screens: `/login` → `/login/totp` or `/login/totp-setup` (QR + recovery codes shown once) → `/` (bare shell: identity, device, sessions, sign out).

## Web design system (Phase 5, in progress)

- **Status (2026-10-08):** the first tile (Fraunces/Literata, vermilion/lime) was rejected. Three directions are built at `app/[locale]/%5Fdesign/directions/{a,b,c}` (dev only) with their own scoped tokens and fonts; screenshots and rationale in `docs/design/directions/`. The owner picks or mixes one; then its tokens move into `root.scss`, it gets a DESIGN.md, and the shell is rebuilt on it.
- **Interim tokens:** `packages/ui/styles/root.scss` holds neutral placeholders; `packages/ui/lib/tokens.test.ts` still enforces WCAG AA on them.
- **Product context:** `PRODUCT.md` (repo root) is binding for every design decision. Impeccable is installed as a plugin; Anthropic's frontend-design skill is vendored at `.claude/skills/frontend-design/`.
- **Theme:** `THEME_SCRIPT` (`packages/ui/lib/theme.ts`) runs inline in `<head>`, reads the `theme` cookie (default `system`) and sets `data-theme` + `data-theme-pref` before paint. The layout never reads cookies, so pages stay static/ISR.
- **Fonts:** one family per role, and it must cover Latin + Azerbaijani + Cyrillic. Verify real glyph coverage (cmap), not the declared subsets: Manrope, Golos Text, Wix Madefor, Rubik, Sofia Sans and Ubuntu Sans fail on az letters.
- **Route groups:** `(site)/layout.tsx` renders the public chrome; `/_design/*` renders its own; `not-found.tsx` brings the chrome itself. The shell's global `h1–h4` font rule leaks into any route that sets its own face, so such routes must reset it (`.root :is(h1,h2,h3,h4) { font-family: inherit }`).
- **Client messages:** the layout's `NextIntlClientProvider` gets only `SHELL_CLIENT_NAMESPACES` (`src/i18n/clientMessages.ts`).
- **Captures:** `node apps/web/scripts/design-shots.mjs [a,b,c] [--first-viewport] [--out dir]` (Playwright 1.62, pinned to match the cached Chromium; reduced motion forced).

## Rules

1. `page.tsx` stays a thin server component. Put interactive UI in a co-located `*Page.tsx` or `views/`, and server fetchers in `lib/getServer*.ts`.
2. No hard-coded copy: every string goes in `packages/i18n/locales/**`. `yarn i18n:check` fails CI on a missing key.
3. No hard-coded colors or px sizes in SCSS. Use `$color-*`, `rem()`, and the `bp-up`/`bp-down` mixins. Tokens live in `packages/ui/styles/root.scss`.
4. App-specific env belongs in `apps/<app>/src/config/env.ts`. **Never put admin values in shared or web env**, because `NEXT_PUBLIC_*` is inlined into the public bundle.
5. `apps/web` must not import `@portfolio/*/admin` (enforced by ESLint).
6. Use `Link`/`redirect` from `@/i18n/navigation` in web, not `next/link`, so the locale prefix is kept.
7. The proxy lives at `src/proxy.ts`. Next ignores a proxy at `src/app/proxy.ts`.
8. New workspace packages go in `transpilePackages` in both `next.config.ts` files.
9. Lint is the ESLint 9 CLI (`eslint .`). `next lint` no longer exists in Next 16.

## Commands

`yarn dev` · `yarn build` · `yarn typecheck` (runs `next typegen` first for the apps) · `yarn lint` · `yarn test` · `yarn i18n:check` · `yarn ci`
