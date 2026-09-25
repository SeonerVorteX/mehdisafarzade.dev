/**
 * Admin-only API surface. Imported only by `apps/admin`. The web app's ESLint config
 * bans `@portfolio/api/admin`, so none of this reaches the public bundle. Paths are
 * relative to the admin app's same-origin `/api` proxy (nginx → `/v1/admin/*`).
 */
export const adminPaths = {
  auth: {
    me: "/auth/me",
  },
} as const;
