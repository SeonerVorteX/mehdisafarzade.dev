import { Injectable } from '@nestjs/common';
import { BaseLoggerService } from '../logger/logger.service';
import { RedisService } from '../redis/redis.service';

const KEY = (k: string) => `cache:${k}`;
const TAG = (t: string) => `cachetag:${t}`;

/**
 * Read-through cache for public content responses (brief §6: "Cache in Redis with
 * tag-based invalidation"). Each entry is registered under its tags (`posts`,
 * `post:<id>`, …); invalidating a tag deletes every entry that carries it. Keys
 * get the app-wide `pf:` prefix from RedisService.
 *
 * Redis failures never break a request: reads fall through to the database, and
 * failed writes/invalidations are logged. The TTL bounds staleness even if an
 * invalidation is lost.
 */
@Injectable()
export class ContentCacheService {
    static readonly TTL_S = 60 * 60;

    constructor(
        private readonly redis: RedisService,
        private readonly logger: BaseLoggerService,
    ) {
        this.logger.setContext(ContentCacheService.name);
    }

    async wrap<T>(key: string, tags: string[], load: () => Promise<T>, ttlS = ContentCacheService.TTL_S): Promise<T> {
        try {
            const hit = await this.redis.client.get(KEY(key));
            if (hit !== null) return JSON.parse(hit) as T;
        } catch (err) {
            this.logger.warn(`cache read failed for ${key}: ${(err as Error).message}`);
        }
        const value = await load();
        try {
            const multi = this.redis.client.multi().set(KEY(key), JSON.stringify(value), 'EX', ttlS);
            for (const tag of new Set(tags)) multi.sadd(TAG(tag), key).expire(TAG(tag), ttlS * 2);
            await multi.exec();
        } catch (err) {
            this.logger.warn(`cache write failed for ${key}: ${(err as Error).message}`);
        }
        return value;
    }

    async invalidate(tags: string[]): Promise<void> {
        try {
            for (const tag of new Set(tags)) {
                const keys = await this.redis.client.smembers(TAG(tag));
                const multi = this.redis.client.multi();
                if (keys.length) multi.del(...keys.map(KEY));
                multi.del(TAG(tag));
                await multi.exec();
            }
        } catch (err) {
            this.logger.error(`cache invalidation failed for [${tags.join(', ')}]: ${(err as Error).message}`);
        }
    }

    /** Drops every cached content entry (admin "revalidate all"). */
    async invalidateAll(): Promise<void> {
        try {
            const prefix = this.redis.client.options.keyPrefix ?? '';
            for (const pattern of ['cache:*', 'cachetag:*']) {
                let cursor = '0';
                do {
                    const [next, found] = await this.redis.client.scan(
                        cursor,
                        'MATCH',
                        `${prefix}${pattern}`,
                        'COUNT',
                        200,
                    );
                    cursor = next;
                    // SCAN returns full key names; strip the prefix ioredis would add again on DEL.
                    if (found.length) await this.redis.client.del(...found.map((k) => k.slice(prefix.length)));
                } while (cursor !== '0');
            }
        } catch (err) {
            this.logger.error(`cache flush failed: ${(err as Error).message}`);
        }
    }
}
