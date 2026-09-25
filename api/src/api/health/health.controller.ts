import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RedisService } from 'src/common/helpers/redis/redis.service';
import { RabbitMQService } from 'src/common/helpers/rmq/rmq.service';

type Check = 'up' | 'down';

/**
 * Used by the deploy workflow's health gate before the nginx flip (127.0.0.1 only;
 * nginx denies /v1/health publicly). 503 when the database is down: an instance
 * that can't reach Postgres must never receive traffic. Redis and RabbitMQ are
 * reported but don't fail the check, because both degrade gracefully.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly rmq: RabbitMQService,
    ) {}

    @Get()
    async check(@Res({ passthrough: true }) res: Response) {
        const [database, redis] = await Promise.all([this.prisma.isHealthy(), this.redis.isHealthy()]);
        const checks: Record<string, Check> = {
            database: database ? 'up' : 'down',
            redis: redis ? 'up' : 'down',
            rabbitmq: this.rmq.isHealthy() ? 'up' : 'down',
        };
        if (!database) res.status(503);
        return {
            status: database ? ('ok' as const) : ('degraded' as const),
            checks,
            message: 'common.HEALTH_OK',
            timestamp: new Date().toISOString(),
        };
    }
}
