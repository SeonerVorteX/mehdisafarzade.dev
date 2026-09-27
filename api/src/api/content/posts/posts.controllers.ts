import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import type { AdminPrincipal } from 'src/api/admin/auth/auth.types';
import { LOCALES, type AppLocale } from 'src/common/constants/locales';
import { AdminAuth, CurrentAdmin } from 'src/common/decorators/adminAuth.decorator';
import { LocaleQueryDto, SearchQueryDto } from 'src/common/dto/query.dto';
import { PreviewGuard } from 'src/common/guards/preview.guard';
import { AuditEntity } from 'src/common/interceptors/audit.interceptor';
import { LocaleParamPipe } from 'src/common/pipes/localeParam.pipe';
import {
    AdminListQueryDto,
    PostBaseDto,
    PostTranslationDto,
    ScheduleDto,
    TagTranslationDto,
} from '../common/content.dto';
import { PostsService } from './posts.service';
import { TagsService } from './tags.service';

class PostsQueryDto extends SearchQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(96)
    tag?: string;
}

class LocalizedPostTranslationDto extends PostTranslationDto {
    @IsIn(LOCALES)
    locale!: AppLocale;
}

class CreatePostDto extends PostBaseDto {
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => LocalizedPostTranslationDto)
    translations?: LocalizedPostTranslationDto[];
}

class UpdatePostDto extends PostBaseDto {
    @IsOptional()
    @IsBoolean()
    needsReview?: boolean;
}

class LocalizedTagTranslationDto extends TagTranslationDto {
    @IsIn(LOCALES)
    locale!: AppLocale;
}

class CreateTagDto {
    @ValidateNested({ each: true })
    @Type(() => LocalizedTagTranslationDto)
    translations!: LocalizedTagTranslationDto[];
}

// ── public ──────────────────────────────────────────────────────────────────

@Controller('posts')
export class PostsPublicController {
    constructor(private readonly posts: PostsService) {}

    @Get()
    list(@Query() q: PostsQueryDto) {
        return this.posts.list(q);
    }

    @Get(':slug')
    bySlug(@Param('slug') slug: string, @Query() q: LocaleQueryDto) {
        return this.posts.bySlug(slug, q.locale);
    }
}

@Controller('tags')
export class TagsPublicController {
    constructor(private readonly tags: TagsService) {}

    @Get()
    list(@Query() q: LocaleQueryDto) {
        return this.tags.list(q.locale);
    }
}

/** Draft preview (web draft mode → API), HMAC-signed, invisible otherwise. */
@Controller('preview/posts')
@UseGuards(PreviewGuard)
export class PostsPreviewController {
    constructor(private readonly posts: PostsService) {}

    @Get(':id')
    preview(@Param('id') id: string, @Query() q: LocaleQueryDto) {
        return this.posts.detail(id, q.locale, true);
    }
}

// ── admin ───────────────────────────────────────────────────────────────────

@Controller('admin/posts')
@AdminAuth()
@AuditEntity('post')
export class PostsAdminController {
    constructor(private readonly posts: PostsService) {}

    @Get()
    list(@Query() q: AdminListQueryDto) {
        return this.posts.adminList(q);
    }

    @Get(':id')
    get(@Param('id') id: string) {
        return this.posts.adminGet(id);
    }

    @Post()
    create(@Body() dto: CreatePostDto, @CurrentAdmin() admin: AdminPrincipal) {
        return this.posts.create(dto, admin.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
        return this.posts.update(id, dto);
    }

    @Put(':id/translations/:locale')
    translate(
        @Param('id') id: string,
        @Param('locale', LocaleParamPipe) locale: AppLocale,
        @Body() dto: PostTranslationDto,
    ) {
        return this.posts.upsertTranslation(id, locale, dto);
    }

    @Delete(':id/translations/:locale')
    removeTranslation(@Param('id') id: string, @Param('locale', LocaleParamPipe) locale: AppLocale) {
        return this.posts.removeTranslation(id, locale);
    }

    @Post(':id/publish')
    @HttpCode(HttpStatus.OK)
    publish(@Param('id') id: string) {
        return this.posts.publish(id);
    }

    @Post(':id/schedule')
    @HttpCode(HttpStatus.OK)
    schedule(@Param('id') id: string, @Body() dto: ScheduleDto) {
        return this.posts.schedule(id, new Date(dto.scheduledAt));
    }

    @Post(':id/unpublish')
    @HttpCode(HttpStatus.OK)
    unpublish(@Param('id') id: string) {
        return this.posts.setStatus(id, 'DRAFT');
    }

    @Post(':id/archive')
    @HttpCode(HttpStatus.OK)
    archive(@Param('id') id: string) {
        return this.posts.setStatus(id, 'ARCHIVED');
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.posts.remove(id);
    }
}

@Controller('admin/tags')
@AdminAuth()
@AuditEntity('tag')
export class TagsAdminController {
    constructor(private readonly tags: TagsService) {}

    @Get()
    list() {
        return this.tags.adminList();
    }

    @Post()
    create(@Body() dto: CreateTagDto) {
        return this.tags.create(dto.translations);
    }

    @Put(':id/translations/:locale')
    translate(
        @Param('id') id: string,
        @Param('locale', LocaleParamPipe) locale: AppLocale,
        @Body() dto: TagTranslationDto,
    ) {
        return this.tags.upsertTranslation(id, locale, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tags.remove(id);
    }
}
