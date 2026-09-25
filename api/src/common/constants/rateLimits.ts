// Request throttling. Shape and naming follow Examination's `rateLimits.ts` (PA-1);
// all state lives in Redis so both blue/green containers share one budget.
export const THROTTLE = {
    // Global per-IP floor on every route (APP_GUARD).
    DEFAULT_LIMIT: 120,
    DEFAULT_TTL_MS: 60 * 1000,

    // Tighter per-IP budget for login-style routes (same 'default' throttler, overridden per route).
    AUTH_LIMIT: 10,
    AUTH_TTL_MS: 60 * 1000,
};

// Admin TOTP lockout: per admin account, not per IP (copied from Examination's ADMIN_OTP_LOCKOUT).
export const ADMIN_OTP_LOCKOUT = {
    MAX_FAILURES: 5,
    FAILURE_WINDOW_MS: 15 * 60 * 1000,
    LOCK_DURATION_MS: 15 * 60 * 1000,
};
