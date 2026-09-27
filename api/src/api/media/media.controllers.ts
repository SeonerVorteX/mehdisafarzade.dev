import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AdminPrincipal } from 'src/api/admin/auth/auth.types';
import { AdminAuth, CurrentAdmin } from 'src/common/decorators/adminAuth.decorator';
import { RawResponse } from 'src/common/decorators/rawResponse.decorator';
import { toPage } from 'src/common/dto/query.dto';
import { AuditEntity } from 'src/common/interceptors/audit.interceptor';
import { LocaleParamPipe } from 'src/common/pipes/localeParam.pipe';
import type { AppLocale } from 'src/common/constants/locales';
import { MediaListQueryDto, MediaTranslationDto, PresignMediaDto } from './dto/media.dto';
import { MEDIA_REDIRECT_CACHE_S } from './media.constants';
import { MediaService } from './media.service';

/** Admin media library (brief §7): presigned upload → finalize → async variants; alt text per locale; usage; delete protection. */
@Controller('admin/media')
@AdminAuth()
@AuditEntity('media')
export class MediaAdminController {
    constructor(private readonly media: MediaService) {}

    @Get()
    async list(@Query() q: MediaListQueryDto) {
        const { items, total } = await this.media.list(q.page, q.pageSize, q.status);
        return toPage(items, total, q.page, q.pageSize);
    }

    @Post('presign')
    @HttpCode(HttpStatus.OK)
    presign(@Body() dto: PresignMediaDto, @CurrentAdmin() admin: AdminPrincipal) {
        return this.media.presign(dto, admin.id);
    }

    @Post(':id/finalize')
    @HttpCode(HttpStatus.OK)
    finalize(@Param('id') id: string) {
        return this.media.finalize(id);
    }

    @Get(':id')
    get(@Param('id') id: string) {
        return this.media.adminView(id);
    }

    @Get(':id/usage')
    usage(@Param('id') id: string) {
        return this.media.usage(id);
    }

    @Put(':id/translations/:locale')
    translate(
        @Param('id') id: string,
        @Param('locale', LocaleParamPipe) locale: AppLocale,
        @Body() dto: MediaTranslationDto,
    ) {
        return this.media.upsertTranslation(id, locale, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.media.remove(id);
    }
}

/**
 * Public media: `GET /v1/media/:id/:variant` → 302 to a short-lived presigned S3 URL
 * (private bucket). Not throttled: a page can reference many images, and the
 * redirect is cached briefly by browsers/Cloudflare.
 */
@Controller('media')
@SkipThrottle()
export class MediaPublicController {
    constructor(private readonly media: MediaService) {}

    @Get(':id/:variant')
    @RawResponse()
    async redirect(@Param('id') id: string, @Param('variant') variant: string, @Res() res: Response) {
        const url = await this.media.resolveVariant(id, variant);
        res.setHeader('Cache-Control', `public, max-age=${MEDIA_REDIRECT_CACHE_S}`);
        res.redirect(302, url);
    }
}
