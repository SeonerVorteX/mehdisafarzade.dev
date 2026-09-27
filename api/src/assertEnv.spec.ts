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

    describe('ADMIN_TRUSTED_SOURCES (fail closed in production)', () => {
        const prod = {
            ...base,
            NODE_ENV: 'production',
            S3_REGION: 'eu-central-1',
            S3_BUCKET: 'b',
            S3_ACCESS_KEY_ID: 'k',
            S3_SECRET_ACCESS_KEY: 's'.repeat(20),
            MAIL_HOST: 'smtp',
            MAIL_PORT: '587',
            MAIL_USER: 'u',
            MAIL_PASS: 'p'.repeat(12),
            MAIL_FROM: 'x <no-reply@example.com>',
            CONTACT_NOTIFY_TO: 'me@example.com',
            IP_HASH_PEPPER: 'q'.repeat(40),
        };

        it('refuses to start in production when it is missing', () => {
            expect(validateEnv(prod).join()).toMatch(/ADMIN_TRUSTED_SOURCES is required/);
        });

        it('refuses an empty or blank list', () => {
            expect(validateEnv({ ...prod, ADMIN_TRUSTED_SOURCES: ' , ' }).join()).toMatch(/at least one IP/);
        });

        it('refuses CIDR ranges and non-IPs', () => {
            const errors = validateEnv({ ...prod, ADMIN_TRUSTED_SOURCES: '10.231.0.0/24,nginx' }).join();
            expect(errors).toMatch(/CIDR range; list exact IPs only/);
            expect(errors).toMatch(/"nginx" is not an IP address/);
        });

        it('accepts the exact production list', () => {
            expect(validateEnv({ ...prod, ADMIN_TRUSTED_SOURCES: '10.231.0.1,10.231.0.31,10.231.0.32' })).toEqual([]);
        });

        it('is optional outside production (defaults to loopback)', () => {
            expect(validateEnv(base)).toEqual([]);
        });
    });

    it('rejects short or placeholder secrets', () => {
        expect(validateEnv({ ...base, ADMIN_JWT_SECRET: 'changeme' }).join()).toMatch(
            /ADMIN_JWT_SECRET must be at least/,
        );
    });
});
