import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { IS_TEST } from 'src/common/constants/env';
import { BaseLoggerService } from 'src/common/helpers/logger/logger.service';
import { RedisService } from 'src/common/helpers/redis/redis.service';
import { PostsService } from './posts.service';

export const PUBLISH_LOCK_KEY = 'lock:publish-scheduled';
const LOCK_TTL_MS = 50_000;

/**
 * Every minute: publish SCHEDULED posts that are due. During a blue/green deploy two
 * API containers run, so a Redis lock (SET NX PX, released only by its owner) makes
 * sure only one of them does the work. publishDue itself is conditional per row,
 * so a lost lock can at worst cause a no-op, never a double publish.
 */
@Injectable()
export class PublishSchedulerService {
    constructor(
        private readonly posts: PostsService,
        private readonly redis: RedisService,
        private readonly logger: BaseLoggerService,
    ) {
        this.logger.setContext(PublishSchedulerService.name);
    }

    @Cron(CronExpression.EVERY_MINUTE, { name: 'publish-scheduled', disabled: IS_TEST })
    async tick(now = new Date()): Promise<string[] | null> {
        const owner = randomUUID();
        let acquired: string | null;
        try {
            acquired = await this.redis.client.set(PUBLISH_LOCK_KEY, owner, 'PX', LOCK_TTL_MS, 'NX');
        } catch (err) {
            this.logger.warn(`scheduler skipped, Redis unavailable: ${(err as Error).message}`);
            return null;
        }
        if (acquired !== 'OK') return null;
        try {
            const ids = await this.posts.publishDue(now);
            if (ids.length) this.logger.log(`published ${ids.length} scheduled post(s): ${ids.join(', ')}`);
            return ids;
        } catch (err) {
            this.logger.error(`publishDue failed: ${(err as Error).message}`);
            return null;
        } finally {
            // Compare-and-delete so we never release a lock another instance took after ours expired.
            await this.redis.client
                .eval(
                    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0",
                    1,
                    PUBLISH_LOCK_KEY,
                    owner,
                )
                .catch(() => undefined);
        }
    }
}
