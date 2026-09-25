import type { Response } from 'express';
import { HealthController } from './health.controller';
import type { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import type { RedisService } from 'src/common/helpers/redis/redis.service';
import type { RabbitMQService } from 'src/common/helpers/rmq/rmq.service';

function make(db: boolean, redis: boolean, rmq: boolean) {
    const prisma = { isHealthy: jest.fn().mockResolvedValue(db) } as unknown as PrismaService;
    const r = { isHealthy: jest.fn().mockResolvedValue(redis) } as unknown as RedisService;
    const q = { isHealthy: jest.fn().mockReturnValue(rmq) } as unknown as RabbitMQService;
    const res = { status: jest.fn() } as unknown as Response;
    return { controller: new HealthController(prisma, r, q), res };
}

describe('HealthController', () => {
    it('is ok when the database is up, even if redis/rabbitmq are down', async () => {
        const { controller, res } = make(true, false, false);
        const body = await controller.check(res);
        expect(body.status).toBe('ok');
        expect(body.checks).toEqual({ database: 'up', redis: 'down', rabbitmq: 'down' });
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 503 when the database is down', async () => {
        const { controller, res } = make(false, true, true);
        const body = await controller.check(res);
        expect(body.status).toBe('degraded');
        expect(res.status).toHaveBeenCalledWith(503);
    });
});
