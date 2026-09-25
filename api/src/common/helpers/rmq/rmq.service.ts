import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { ConfirmChannel } from 'amqplib';
import { connect, type AmqpConnectionManager, type ChannelWrapper } from 'amqp-connection-manager';
import { RABBITMQ_URL } from '../../constants/env';
import {
    EVENTS_DLQ,
    EVENTS_DLX,
    EVENTS_EXCHANGE,
    EVENTS_EXCHANGE_TYPE,
    EVENTS_QUEUE,
    type EventName,
} from '../../constants/rabbitmq';
import { BaseLoggerService } from '../logger/logger.service';

/**
 * Publisher side of RabbitMQ (Examination's RabbitMQService). It also asserts the
 * whole topology (exchange, queue with DLX, dead-letter queue), so the consumer
 * attached in main.ts always finds its queue.
 *
 * Nest's RMQ transport serialises messages as `{ pattern, data }`, and
 * `@EventPattern('contact.received')` handlers match on `pattern`. We publish
 * that shape so producers and consumers share one wire format.
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private connection?: AmqpConnectionManager;
    private channel?: ChannelWrapper;
    private connected = false;

    constructor(private readonly logger: BaseLoggerService) {
        this.logger.setContext(RabbitMQService.name);
    }

    async onModuleInit() {
        this.connection = connect([RABBITMQ_URL]);
        this.connection.on('connect', () => {
            this.connected = true;
            this.logger.log('RabbitMQ connected');
        });
        this.connection.on('disconnect', ({ err }) => {
            this.connected = false;
            this.logger.error(`RabbitMQ disconnected: ${err?.message ?? 'unknown'}`);
        });

        this.channel = this.connection.createChannel({
            json: false,
            setup: async (ch: ConfirmChannel) => {
                await ch.assertExchange(EVENTS_EXCHANGE, EVENTS_EXCHANGE_TYPE, { durable: true });
                await ch.assertExchange(EVENTS_DLX, 'fanout', { durable: true });
                await ch.assertQueue(EVENTS_DLQ, { durable: true });
                await ch.bindQueue(EVENTS_DLQ, EVENTS_DLX, '');
                await ch.assertQueue(EVENTS_QUEUE, {
                    durable: true,
                    arguments: { 'x-dead-letter-exchange': EVENTS_DLX },
                });
                await ch.bindQueue(EVENTS_QUEUE, EVENTS_EXCHANGE, '#');
            },
        });
    }

    async onModuleDestroy() {
        await this.channel?.close();
        await this.connection?.close();
    }

    isHealthy(): boolean {
        return this.connected;
    }

    /** Publishes a persistent event. Resolves once the broker confirms it. */
    async publish<T>(pattern: EventName, data: T): Promise<void> {
        if (!this.channel) throw new Error('RabbitMQ channel not initialised');
        const body = Buffer.from(JSON.stringify({ pattern, data }));
        await this.channel.publish(EVENTS_EXCHANGE, pattern, body, {
            contentType: 'application/json',
            persistent: true,
        });
    }
}
