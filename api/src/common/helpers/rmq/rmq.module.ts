import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rmq.service';

@Global()
@Module({
    providers: [RabbitMQService],
    exports: [RabbitMQService],
})
export class RabbitMQModule {}
