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
