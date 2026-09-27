import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { AdminModule } from './api/admin/admin.module';
import { ContentModule } from './api/content/content.module';
import { EventsModule } from './api/events/events.module';
import { HealthModule } from './api/health/health.module';
import { MediaModule } from './api/media/media.module';
import { THROTTLE } from './common/constants/rateLimits';
import { AppThrottlerGuard } from './common/guards/appThrottler.guard';
import { AuditModule } from './common/helpers/audit/audit.module';
import { ContentCacheModule } from './common/helpers/cache/cache.module';
import { LoggerModule } from './common/helpers/logger/logger.module';
import { MailerModule } from './common/helpers/mailer/mailer.module';
import { PrismaModule } from './common/helpers/prisma/prisma.module';
import { RedisModule } from './common/helpers/redis/redis.module';
import { RedisService } from './common/helpers/redis/redis.service';
import { RabbitMQModule } from './common/helpers/rmq/rmq.module';
import { S3Module } from './common/helpers/s3/s3.module';
import { I18nModule } from './common/i18n/i18n.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        LoggerModule,
        I18nModule,
        PrismaModule,
        RedisModule,
        RabbitMQModule,
        S3Module,
        MailerModule,
        AuditModule,
        ContentCacheModule,
        ThrottlerModule.forRootAsync({
            inject: [RedisService],
            useFactory: (redis: RedisService) => ({
                // Only one throttler name, like Examination (a second always-checked name
                // would fire on unrelated routes); per-route budgets use @Throttle overrides.
                throttlers: [{ name: 'default', ttl: THROTTLE.DEFAULT_TTL_MS, limit: THROTTLE.DEFAULT_LIMIT }],
                storage: new ThrottlerStorageRedisService(redis.client),
            }),
        }),
        HealthModule,
        AdminModule,
        MediaModule,
        ContentModule,
        EventsModule,
    ],
    providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
