import { Global, Module } from '@nestjs/common';
import { BaseLoggerService } from './logger.service';

@Global()
@Module({
    providers: [BaseLoggerService],
    exports: [BaseLoggerService],
})
export class LoggerModule {}
