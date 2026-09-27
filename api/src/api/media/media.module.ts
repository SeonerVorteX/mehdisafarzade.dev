import { Module } from '@nestjs/common';
import { MediaAdminController, MediaPublicController } from './media.controllers';
import { MediaService } from './media.service';

@Module({
    controllers: [MediaAdminController, MediaPublicController],
    providers: [MediaService],
    exports: [MediaService],
})
export class MediaModule {}
