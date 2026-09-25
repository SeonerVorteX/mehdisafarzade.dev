/**
 * Admin realm constants (PLAN §8.3). Cookies are host-only on the admin host
 * (`__Host-` prefix: Secure, Path=/, no Domain) because the API is reached
 * same-origin through nginx (admin.* /api/* → /v1/admin/*).
 */
export const ADMIN_COOKIES = {
    /** 10-minute access JWT (httpOnly, SameSite=Strict) */
    ACCESS: '__Host-pf_at',
    /** opaque rotating refresh token (httpOnly, SameSite=Strict) */
    REFRESH: '__Host-pf_rt',
    /** double-submit CSRF token (readable by JS, SameSite=Strict) */
    CSRF: '__Host-pf_csrf',
    /** "password OK, TOTP pending" JWT (httpOnly, SameSite=Strict) */
    PENDING: '__Host-pf_pending',
    /** Google OAuth state + PKCE verifier (httpOnly, SameSite=Lax: the callback is a cross-site navigation) */
    OAUTH: '__Host-pf_oauth',
} as const;

export const ADMIN_TTL = {
    ACCESS_S: 10 * 60,
    REFRESH_S: 14 * 24 * 60 * 60,
    PENDING_S: 5 * 60,
    OAUTH_S: 10 * 60,
    /** a rotated refresh token presented again within this window is a benign tab race, not theft */
    REFRESH_RACE_GRACE_MS: 15 * 1000,
    /** cache of "session sid is valid" checks done by the access guard */
    SESSION_CACHE_S: 60,
} as const;

export const ADMIN_JWT = {
    ISSUER: 'pf-api',
    AUDIENCE: 'pf-admin',
    PENDING_AUDIENCE: 'pf-admin-pending',
} as const;

/** Header set by nginx after the device gate. Clients can't forge it: nginx overwrites it on admin.* and clears it on api.*. */
export const ADMIN_DEVICE_HEADER = 'x-admin-device';
export const ADMIN_DEVICE_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

export const RECOVERY_CODE_COUNT = 10;
export const TOTP_ISSUER = 'mehdisafarzade.dev';

/** Per-account password failures before a temporary lock (per email, not per IP). */
export const ADMIN_PASSWORD_LOCKOUT = {
    MAX_FAILURES: 10,
    FAILURE_WINDOW_MS: 15 * 60 * 1000,
    LOCK_DURATION_MS: 15 * 60 * 1000,
};
