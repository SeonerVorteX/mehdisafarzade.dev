import { Global, Module } from '@nestjs/common';
import { RevalidationService } from '../revalidation/revalidation.service';
import { ContentCacheService } from './contentCache.service';

@Global()
@Module({
    providers: [ContentCacheService, RevalidationService],
    exports: [ContentCacheService, RevalidationService],
})
export class ContentCacheModule {}
