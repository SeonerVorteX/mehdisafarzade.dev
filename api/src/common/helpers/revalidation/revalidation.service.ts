import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { REVALIDATE, IS_TEST } from '../../constants/env';
import { EVENTS } from '../../constants/rabbitmq';
import { ContentCacheService } from '../cache/contentCache.service';
import { BaseLoggerService } from '../logger/logger.service';
import { RabbitMQService } from '../rmq/rmq.service';

export type ContentChangedEvent = { tags: string[]; at: string };

/** HMAC-SHA256 over `${timestamp}.${body}` (shared REVALIDATE_SECRET); the web route checks it and a 5-min window. */
export function signRevalidation(body: string, timestamp: string, secret: string): string {
    return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * On every content write (PLAN §7):
 *  1. the API's own Redis content cache is invalidated synchronously, so the next API read is fresh, and
 *  2. a `content.changed` event goes to RabbitMQ; the consumer (api/events) calls
 *     `POST <web>/api/revalidate` on EVERY web colour, since each has its own ISR cache
 *     and the standby must stay warm for rollback.
 * If RabbitMQ is down, the web's time-based `revalidate` fallback still bounds staleness.
 */
@Injectable()
export class RevalidationService {
    constructor(
        private readonly cache: ContentCacheService,
        private readonly rmq: RabbitMQService,
        private readonly logger: BaseLoggerService,
    ) {
        this.logger.setContext(RevalidationService.name);
    }

    async contentChanged(tags: string[]): Promise<void> {
        const unique = [...new Set(tags)];
        await this.cache.invalidate(unique);
        try {
            await this.rmq.publish<ContentChangedEvent>(EVENTS.CONTENT_CHANGED, {
                tags: unique,
                at: new Date().toISOString(),
            });
        } catch (err) {
            this.logger.warn(
                `content.changed not published (${(err as Error).message}); web relies on time-based revalidation`,
            );
        }
    }

    /** Called by the RMQ consumer: notify each web instance. Never throws. */
    async notifyWeb(tags: string[]): Promise<{ url: string; ok: boolean; status?: number }[]> {
        if (!REVALIDATE.secret || REVALIDATE.urls.length === 0) {
            if (!IS_TEST) this.logger.debug('revalidation webhook not configured; skipping');
            return [];
        }
        const body = JSON.stringify({ tags });
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = signRevalidation(body, timestamp, REVALIDATE.secret);
        return Promise.all(
            REVALIDATE.urls.map(async (url) => {
                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                            'x-revalidate-timestamp': timestamp,
                            'x-revalidate-signature': signature,
                        },
                        body,
                        signal: AbortSignal.timeout(5000),
                    });
                    if (!res.ok) this.logger.warn(`revalidate ${url} → ${res.status}`);
                    return { url, ok: res.ok, status: res.status };
                } catch (err) {
                    // A stopped blue/green colour is expected to fail; log quietly.
                    this.logger.debug(`revalidate ${url} failed: ${(err as Error).message}`);
                    return { url, ok: false };
                }
            }),
        );
    }
}
