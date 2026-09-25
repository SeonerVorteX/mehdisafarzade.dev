import { Module } from '@nestjs/common';
import { HealthModule } from './api/health/health.module';

@Module({
    imports: [HealthModule],
})
export class AppModule {}
