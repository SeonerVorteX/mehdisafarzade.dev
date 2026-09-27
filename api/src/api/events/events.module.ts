import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { EventsController } from './events.controller';

/** RabbitMQ consumers (no HTTP routes). */
@Module({
    imports: [MediaModule],
    controllers: [EventsController],
})
export class EventsModule {}
