// MUST stay the first import: validates process.env before anything (notably
// @prisma/client, which auto-loads a `.env`) can backfill values. See the file header.
import './assertEnv';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { configureApp, createExpressAdapter } from './app.setup';
import { RABBITMQ_URL, SERVER_PORT } from './common/constants/env';
import { EVENTS_EXCHANGE, EVENTS_EXCHANGE_TYPE, EVENTS_QUEUE } from './common/constants/rabbitmq';
import { winstonLogger } from './common/utils/logger.util';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, createExpressAdapter(), {
        logger: WinstonModule.createLogger({ instance: winstonLogger }),
    });
    configureApp(app);

    // RMQ consumer on the same process (Examination pattern): topic exchange, manual ack.
    // The queue/exchange/DLX topology is asserted by RabbitMQService on boot.
    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [RABBITMQ_URL],
            queue: EVENTS_QUEUE,
            exchange: EVENTS_EXCHANGE,
            exchangeType: EVENTS_EXCHANGE_TYPE,
            wildcards: true,
            noAck: false,
            prefetchCount: 8,
            queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': 'pf.events.dlx' } },
        },
    });

    app.enableShutdownHooks();
    await app.startAllMicroservices();
    await app.listen(SERVER_PORT, '0.0.0.0');
    winstonLogger.info(`API listening on :${SERVER_PORT}`, { context: 'Bootstrap' });
}

void bootstrap();
