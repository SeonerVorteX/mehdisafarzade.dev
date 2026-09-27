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

## Web design system (Phase 5)

- **Tokens:** `packages/ui/styles/root.scss` is the only place raw values live (light/dark mixins, accent mixins, spacing, type scale, motion). `packages/ui/lib/tokens.test.ts` parses it and fails on any text/surface or accent pair below WCAG AA.
- **Theme:** `THEME_SCRIPT` (`packages/ui/lib/theme.ts`) runs inline in `<head>`, reads the `theme` cookie (default `system`) and sets `data-theme` + `data-theme-pref` before paint. The layout never reads cookies, so pages stay static/ISR. `ThemeToggle` writes the cookie (shared domain in production).
- **Fonts** (`apps/web/src/styles/fonts.ts`): Inter (UI), JetBrains Mono (code/labels), Fraunces (display), Literata (display on `ru`: the candidates have no Cyrillic). All via next/font; exposed as `--font-*` variables on `<html>`.
- **Styles:** Examination-style global partials (`apps/web/src/styles/_base.scss`, `_typography.scss`, `components/_*.scss`) pulled in by `main.scss`. Partials `@use "mixins" / "variables" / "breakpoints"` (resolved through `sassOptions.loadPaths`).
- **Client messages:** the layout's `NextIntlClientProvider` gets only `SHELL_CLIENT_NAMESPACES` (`src/i18n/clientMessages.ts`). A page with its own client islands nests a provider with its extra namespaces. Everything else renders on the server and its strings never ship to the browser.
- **Style tile:** `app/[locale]/%5Fdesign` (`%5F` = `_`, since `_folders` are private in Next). Dev only: production renders a 404 with no tile metadata. It and `styles/components/_design.scss` go away once the look is built out.

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
