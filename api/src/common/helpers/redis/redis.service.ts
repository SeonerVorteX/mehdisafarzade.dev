import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_KEY_PREFIX, REDIS_URL } from '../../constants/env';
import { BaseLoggerService } from '../logger/logger.service';

/**
 * One shared Redis connection (Examination's RedisService). Production Redis is
 * shared with Examination, so every key is namespaced via `keyPrefix` (`pf:`)
 * and the URL selects DB index 1 (PLAN §0). Consumers use `client` directly and
 * write keys WITHOUT the prefix; ioredis adds it.
 *
 * Boot doesn't fail if Redis is down (rate limiting degrades, nginx's limit_req
 * stays as the backstop), matching Examination. Features that need Redis for
 * correctness (admin OTP lockout, refresh-token reuse detection) decide their
 * own fail-open/fail-closed behavior.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    readonly client = new Redis(REDIS_URL, {
        keyPrefix: REDIS_KEY_PREFIX,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
    });

    constructor(private readonly logger: BaseLoggerService) {
        this.logger.setContext(RedisService.name);
    }

    async onModuleInit() {
        this.client.on('error', (err: Error) => this.logger.error(`Redis error: ${err.message}`));
        try {
            await this.client.connect();
            this.logger.log('Redis connected');
        } catch (err) {
            this.logger.error(`Redis failed to connect at boot, continuing without it: ${(err as Error).message}`);
        }
    }

    async onModuleDestroy() {
        this.client.disconnect();
    }

    async isHealthy(): Promise<boolean> {
        try {
            return (await this.client.ping()) === 'PONG';
        } catch {
            return false;
        }
    }
}
