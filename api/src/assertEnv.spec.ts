process.env.PORTFOLIO_SKIP_ENV_ASSERT = '1';
import { validateEnv } from './assertEnv';

const base = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://portfolio:portfolio@localhost:5436/portfolio',
    REDIS_URL: 'redis://localhost:6382/1',
    RABBITMQ_URL: 'amqp://portfolio:portfolio@localhost:5673/portfolio',
    WEB_ORIGIN: 'http://localhost:5600',
    ADMIN_ORIGIN: 'https://localhost:8443',
    ADMIN_JWT_SECRET: 'a'.repeat(48),
    ADMIN_PENDING_JWT_SECRET: 'b'.repeat(48),
    TOTP_ENC_KEY: 'c'.repeat(44),
};

describe('validateEnv', () => {
    it('accepts a complete dev environment', () => {
        expect(validateEnv(base)).toEqual([]);
    });

    it('rejects a remote database outside production', () => {
        const errors = validateEnv({ ...base, DATABASE_URL: 'postgresql://u:p@185.198.27.86:5432/portfolio' });
        expect(errors.join()).toMatch(/DATABASE_URL points at "185.198.27.86"/);
    });

    it('allows portfolio-* compose hostnames outside production', () => {
        expect(validateEnv({ ...base, REDIS_URL: 'redis://portfolio-redis-dev:6379/1' })).toEqual([]);
    });

    it('requires S3 / mail / pepper only in production', () => {
        const errors = validateEnv({ ...base, NODE_ENV: 'production' }).join('\n');
        expect(errors).toMatch(/S3_BUCKET is required/);
        expect(errors).toMatch(/MAIL_HOST is required/);
        expect(errors).toMatch(/IP_HASH_PEPPER is required/);
    });

    it('rejects short or placeholder secrets', () => {
        expect(validateEnv({ ...base, ADMIN_JWT_SECRET: 'changeme' }).join()).toMatch(
            /ADMIN_JWT_SECRET must be at least/,
        );
    });

    it('requires both Google OAuth values together', () => {
        expect(validateEnv({ ...base, ADMIN_GOOGLE_CLIENT_ID: 'x.apps.googleusercontent.com' }).join()).toMatch(
            /must be set together/,
        );
    });

    it('validates the Google allowlist emails', () => {
        expect(validateEnv({ ...base, ADMIN_GOOGLE_ALLOWLIST: 'me@example.com, nope' }).join()).toMatch(
            /invalid email "nope"/,
        );
    });
});
