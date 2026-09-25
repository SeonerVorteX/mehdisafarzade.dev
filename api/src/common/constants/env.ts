/**
 * Typed access to environment values (Examination keeps these in
 * `common/constants/*.ts` read straight from process.env; same here).
 * `src/assertEnv.ts` has already validated them by the time this loads in
 * `main.ts`. Tests set what they need via `test/e2e.env` / jest setup.
 */
const env = process.env;

function bool(v: string | undefined, fallback = false): boolean {
    if (v === undefined || v === '') return fallback;
    return v === 'true' || v === '1';
}

function list(v: string | undefined): string[] {
    return (v ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export const NODE_ENV = env.NODE_ENV ?? 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_TEST = NODE_ENV === 'test';
export const SERVER_PORT = Number(env.SERVER_PORT ?? 3100);
export const LOG_DIR = env.LOG_DIR || './logs';
export const LOG_LEVEL = env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug');

export const DATABASE_URL = env.DATABASE_URL ?? '';
export const REDIS_URL = env.REDIS_URL ?? '';
/** Every key this app writes is namespaced (shared Redis in production, PLAN §0). */
export const REDIS_KEY_PREFIX = env.REDIS_KEY_PREFIX || 'pf:';
export const RABBITMQ_URL = env.RABBITMQ_URL ?? '';

export const WEB_ORIGIN = (env.WEB_ORIGIN ?? '').replace(/\/$/, '');
export const ADMIN_ORIGIN = (env.ADMIN_ORIGIN ?? '').replace(/\/$/, '');
/** Browser origins allowed by CORS: the public site only. Admin calls are same-origin through nginx. */
export const CORS_ORIGINS = [WEB_ORIGIN, ...list(env.CORS_EXTRA_ORIGINS)].filter(Boolean);

export const S3 = {
    region: env.S3_REGION || 'eu-central-1',
    bucket: env.S3_BUCKET ?? '',
    accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: bool(env.S3_FORCE_PATH_STYLE),
    get configured(): boolean {
        return !!(this.bucket && this.accessKeyId && this.secretAccessKey);
    },
};

export const MAIL = {
    host: env.MAIL_HOST ?? '',
    port: Number(env.MAIL_PORT ?? 587),
    secure: bool(env.MAIL_SECURE),
    user: env.MAIL_USER ?? '',
    pass: env.MAIL_PASS ?? '',
    from: env.MAIL_FROM || 'Mehdi Safarzade <no-reply@mehdisafarzade.dev>',
    contactNotifyTo: env.CONTACT_NOTIFY_TO ?? '',
    get configured(): boolean {
        return !!this.host;
    },
};

export const IP_HASH_PEPPER = env.IP_HASH_PEPPER ?? '';

export const ADMIN_AUTH = {
    jwtSecret: env.ADMIN_JWT_SECRET ?? '',
    pendingJwtSecret: env.ADMIN_PENDING_JWT_SECRET ?? '',
    totpEncKey: env.TOTP_ENC_KEY ?? '',
    google: {
        clientId: env.ADMIN_GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.ADMIN_GOOGLE_CLIENT_SECRET ?? '',
        allowlist: list(env.ADMIN_GOOGLE_ALLOWLIST).map((e) => e.toLowerCase()),
        get enabled(): boolean {
            return !!(this.clientId && this.clientSecret);
        },
    },
};
