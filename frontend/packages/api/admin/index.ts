/**
 * Admin-only API surface. Imported only by `apps/admin`. The web app's ESLint config
 * bans `@portfolio/api/admin`, so none of this reaches the public bundle. Paths are
 * relative to the admin app's same-origin `/api` proxy (nginx → `/v1/admin/*`).
 */
export const adminPaths = {
  auth: {
    pending: "/auth/pending",
    login: "/auth/login",
    totpSetup: "/auth/totp/setup",
    totpEnable: "/auth/totp/enable",
    totpVerify: "/auth/totp/verify",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    me: "/auth/me",
    sessions: "/auth/sessions",
    session: (id: string) => `/auth/sessions/${encodeURIComponent(id)}`,
  },
} as const;

/** Cookie names set by the API on the admin host (see api/src/common/constants/admin.ts). */
export const ADMIN_COOKIE = {
  ACCESS: "__Host-pf_at",
  REFRESH: "__Host-pf_rt",
  CSRF: "__Host-pf_csrf",
} as const;

export type LoginStep = "totp" | "totp-setup";

export type AdminPending = { step: LoginStep | null };
export type AdminLoginResponse = { step: LoginStep };
export type AdminTotpSetup = { otpauthUrl: string; secret: string; account: string };
export type AdminTotpEnable = { recoveryCodes: string[] };
export type AdminTotpVerify = { usedRecoveryCode: boolean; remainingRecoveryCodes: number };

export type AdminMe = {
  id: string;
  email: string;
  device: string;
  sessionId: string;
  totpEnabledAt: string | null;
  lastLoginAt: string | null;
  remainingRecoveryCodes: number;
};

export type AdminSessionInfo = {
  id: string;
  familyId: string;
  deviceName: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};
