/**
 * Boot-time environment validation. MUST stay the first import in `main.ts`.
 *
 * Same idea as Examination's `assertConnectionEnv.ts`, extended to every
 * variable: this module has NO imports of its own, so it inspects
 * `process.env` exactly as the OS / docker `env_file` / `dotenv-cli` left it,
 * before `@prisma/client` (which auto-loads a `.env` from the project root) or
 * anything else can backfill values. We also deliberately do not use
 * `@nestjs/config`'s `ConfigModule.forRoot()`, which backfills from `.env` too
 * (the Examination footgun where a local run silently inherited production
 * values).
 *
 * Rules:
 *  - `required`: must be set in every environment.
 *  - `prodRequired`: must be set when NODE_ENV=production (optional in dev/test,
 *    where the feature degrades: e.g. no S3 → media endpoints return 503).
 *  - Outside production, DATABASE_URL / REDIS_URL / RABBITMQ_URL must point at
 *    localhost or a `portfolio-*` compose service, never a remote host.
 */

type Rule = {
    required?: boolean;
    prodRequired?: boolean;
    kind?: 'url' | 'int' | 'bool' | 'secret' | 'email' | 'ips' | 'string';
    /** Minimum length for secrets (bytes of entropy matter more, but this catches placeholders). */
    min?: number;
};

export const ENV_RULES: Record<string, Rule> = {
    NODE_ENV: { required: true, kind: 'string' },
    SERVER_PORT: { kind: 'int' },
    LOG_DIR: { kind: 'string' },
    LOG_LEVEL: { kind: 'string' },

    DATABASE_URL: { required: true, kind: 'url' },
    REDIS_URL: { required: true, kind: 'url' },
    REDIS_KEY_PREFIX: { kind: 'string' },
    RABBITMQ_URL: { required: true, kind: 'url' },

    WEB_ORIGIN: { required: true, kind: 'url' },
    ADMIN_ORIGIN: { required: true, kind: 'url' },
    CORS_EXTRA_ORIGINS: { kind: 'string' },

    S3_REGION: { prodRequired: true, kind: 'string' },
    S3_BUCKET: { prodRequired: true, kind: 'string' },
    S3_ACCESS_KEY_ID: { prodRequired: true, kind: 'string' },
    S3_SECRET_ACCESS_KEY: { prodRequired: true, kind: 'secret', min: 16 },
    S3_ENDPOINT: { kind: 'url' },
    S3_FORCE_PATH_STYLE: { kind: 'bool' },

    MAIL_HOST: { prodRequired: true, kind: 'string' },
    MAIL_PORT: { prodRequired: true, kind: 'int' },
    MAIL_SECURE: { kind: 'bool' },
    MAIL_USER: { prodRequired: true, kind: 'string' },
    MAIL_PASS: { prodRequired: true, kind: 'secret', min: 8 },
    MAIL_FROM: { prodRequired: true, kind: 'string' },
    CONTACT_NOTIFY_TO: { prodRequired: true, kind: 'email' },

    IP_HASH_PEPPER: { prodRequired: true, kind: 'secret', min: 32 },

    // Exact peer IPs allowed to send X-Admin-Device / X-Real-IP (PLAN §9.2). Production:
    // the portfolio bridge gateway (host nginx) + the admin containers' blue/green IPs.
    // Fail closed: required and must parse in production. Dev/test default: loopback.
    ADMIN_TRUSTED_SOURCES: { prodRequired: true, kind: 'ips' },

    // Content → web revalidation webhook and draft previews (shared with the web app).
    WEB_REVALIDATE_URLS: { prodRequired: true, kind: 'string' },
    REVALIDATE_SECRET: { prodRequired: true, kind: 'secret', min: 32 },
    PREVIEW_SECRET: { prodRequired: true, kind: 'secret', min: 32 },

    // Admin realm (Phase 3)
    ADMIN_JWT_SECRET: { required: true, kind: 'secret', min: 32 },
    ADMIN_PENDING_JWT_SECRET: { required: true, kind: 'secret', min: 32 },
    TOTP_ENC_KEY: { required: true, kind: 'secret', min: 44 },
};

const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|::1|\[::1\]|portfolio-[a-z0-9-]+)$/i;

export function validateEnv(env: NodeJS.ProcessEnv): string[] {
    const errors: string[] = [];
    const isProd = env.NODE_ENV === 'production';

    if (env.NODE_ENV && !['development', 'test', 'production'].includes(env.NODE_ENV)) {
        errors.push(`NODE_ENV must be development | test | production (got "${env.NODE_ENV}")`);
    }

    for (const [key, rule] of Object.entries(ENV_RULES)) {
        const raw = env[key];
        const value = raw?.trim();
        if (!value) {
            if (rule.required || (isProd && rule.prodRequired)) errors.push(`${key} is required`);
            continue;
        }
        switch (rule.kind) {
            case 'url':
                try {
                    new URL(value);
                } catch {
                    errors.push(`${key} must be a valid URL`);
                }
                break;
            case 'int':
                if (!/^\d+$/.test(value)) errors.push(`${key} must be an integer`);
                break;
            case 'bool':
                if (!['true', 'false', '1', '0'].includes(value)) errors.push(`${key} must be true/false`);
                break;
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push(`${key} must be an email address`);
                break;
            case 'ips': {
                // Kept import-free (see file header): a strict IPv4 check + a coarse IPv6 shape
                // check. The runtime parser (trustedSources.util) re-validates with node:net.
                const entries = value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (entries.length === 0) errors.push(`${key} must list at least one IP`);
                for (const e of entries) {
                    const ipv4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(e);
                    const ipv6 = /^[0-9a-f:.]+$/i.test(e) && e.includes(':');
                    if (e.includes('/')) errors.push(`${key}: "${e}" is a CIDR range; list exact IPs only`);
                    else if (!ipv4 && !ipv6) errors.push(`${key}: "${e}" is not an IP address`);
                }
                break;
            }
            case 'secret':
                if (rule.min && value.length < rule.min) errors.push(`${key} must be at least ${rule.min} characters`);
                if (/^(changeme|secret|password|xxx+|todo)$/i.test(value))
                    errors.push(`${key} looks like a placeholder`);
                break;
        }
    }

    if (!isProd) {
        for (const key of ['DATABASE_URL', 'REDIS_URL', 'RABBITMQ_URL']) {
            const value = env[key];
            if (!value) continue;
            try {
                const host = new URL(value).hostname;
                if (!LOCAL_HOSTS.test(host)) {
                    errors.push(
                        `${key} points at "${host}" while NODE_ENV=${env.NODE_ENV}. Outside production only ` +
                            `localhost / portfolio-* compose services are allowed, so a local run can never ` +
                            `touch a shared or production service.`,
                    );
                }
            } catch {
                /* reported above */
            }
        }
    }

    return errors;
}

export function assertEnv(env: NodeJS.ProcessEnv = process.env): void {
    const errors = validateEnv(env);
    if (errors.length) {
        console.error(`FATAL: invalid environment:\n  - ${errors.join('\n  - ')}\nSee api/.env.example.`);
        process.exit(1);
    }
}

// Runs on import. Load-bearing: imports are evaluated before any statement in
// main.ts, so a call site after the import block would be too late.
if (process.env.PORTFOLIO_SKIP_ENV_ASSERT !== '1') assertEnv();
