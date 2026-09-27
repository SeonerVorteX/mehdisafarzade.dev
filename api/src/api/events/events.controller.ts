import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, Message } from 'amqplib';
import { EVENTS } from 'src/common/constants/rabbitmq';
import { BaseLoggerService } from 'src/common/helpers/logger/logger.service';
import { RevalidationService, type ContentChangedEvent } from 'src/common/helpers/revalidation/revalidation.service';
import { MediaService, type MediaUploadedEvent } from '../media/media.service';

/**
 * RabbitMQ consumers (Examination's api/events pattern: @Controller with no HTTP
 * routes). Manual ack. A handler that throws is nacked WITHOUT requeue, so the
 * message goes to the dead-letter queue (pf.api.events.dlq) instead of looping.
 * Handlers are idempotent (media processing skips non-PENDING media; revalidation
 * is naturally repeatable).
 */
@Controller()
export class EventsController {
    constructor(
        private readonly media: MediaService,
        private readonly revalidation: RevalidationService,
        private readonly logger: BaseLoggerService,
    ) {
        this.logger.setContext(EventsController.name);
    }

    private async run(ctx: RmqContext, name: string, fn: () => Promise<unknown>) {
        const channel = ctx.getChannelRef() as Channel;
        const msg = ctx.getMessage() as Message;
        try {
            await fn();
            channel.ack(msg);
        } catch (err) {
            this.logger.error(`${name} failed, dead-lettering: ${(err as Error).message}`);
            channel.nack(msg, false, false);
        }
    }

    @EventPattern(EVENTS.MEDIA_UPLOADED)
    async onMediaUploaded(@Payload() data: MediaUploadedEvent, @Ctx() ctx: RmqContext) {
        await this.run(ctx, EVENTS.MEDIA_UPLOADED, () => this.media.process(data.mediaId));
    }

    @EventPattern(EVENTS.CONTENT_CHANGED)
    async onContentChanged(@Payload() data: ContentChangedEvent, @Ctx() ctx: RmqContext) {
        await this.run(ctx, EVENTS.CONTENT_CHANGED, () => this.revalidation.notifyWeb(data.tags));
    }
}
