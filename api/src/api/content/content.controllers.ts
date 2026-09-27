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
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { type AppLocale } from 'src/common/constants/locales';
import { AdminAuth } from 'src/common/decorators/adminAuth.decorator';
import { LocaleQueryDto } from 'src/common/dto/query.dto';
import { PreviewGuard } from 'src/common/guards/preview.guard';
import { AuditEntity } from 'src/common/interceptors/audit.interceptor';
import { LocaleParamPipe } from 'src/common/pipes/localeParam.pipe';
import {
    EducationBaseDto,
    EducationTranslationDto,
    ExperienceBaseDto,
    ExperienceTranslationDto,
    PageBaseDto,
    PageTranslationDto,
    ProfileBaseDto,
    ProfileTranslationDto,
    ProjectBaseDto,
    ProjectTranslationDto,
    ReorderDto,
    ResumeDto,
    SkillDto,
} from './common/content.dto';
import { PagesService } from './pages/pages.service';
import { ProfileService } from './profile/profile.service';
import { ProjectsService } from './projects/projects.service';
import { ResumeService } from './resume/resume.service';
import { SkillsService } from './skills/skills.service';

const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

class ProjectsQueryDto extends LocaleQueryDto {
    @IsOptional()
    @Transform(toBool)
    @IsBoolean()
    featured?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(60)
    skill?: string;
}

class CreateProjectDto extends ProjectBaseDto {
    @IsString()
    @MaxLength(200)
    title!: string;
}
class UpdateProjectDto extends ProjectBaseDto {
    @IsOptional()
    @IsBoolean()
    needsReview?: boolean;
}
class CreateExperienceDto extends ExperienceBaseDto {
    @IsString()
    @MaxLength(160)
    title!: string;
}
class UpdateExperienceDto extends ExperienceBaseDto {
    @IsOptional()
    @IsBoolean()
    needsReview?: boolean;
}
class CreateEducationDto extends EducationBaseDto {
    @IsString()
    @MaxLength(160)
    degree!: string;
}
class UpdateEducationDto extends EducationBaseDto {
    @IsOptional()
    @IsBoolean()
    needsReview?: boolean;
}
class CreatePageDto extends PageBaseDto {
    @IsString()
    @MaxLength(160)
    title!: string;
}
class UpdateProfileDto extends ProfileBaseDto {
    @IsOptional()
    @IsBoolean()
    needsReview?: boolean;
}

// ── public ──────────────────────────────────────────────────────────────────

@Controller('profile')
export class ProfilePublicController {
    constructor(private readonly profile: ProfileService) {}
    @Get()
    get(@Query() q: LocaleQueryDto) {
        return this.profile.get(q.locale);
    }
}

@Controller('projects')
export class ProjectsPublicController {
    constructor(private readonly projects: ProjectsService) {}
    @Get()
    list(@Query() q: ProjectsQueryDto) {
        return this.projects.list(q.locale, q.featured, q.skill);
    }
    @Get(':slug')
    bySlug(@Param('slug') slug: string, @Query() q: LocaleQueryDto) {
        return this.projects.bySlug(slug, q.locale);
    }
}

@Controller()
export class ResumePublicController {
    constructor(private readonly resume: ResumeService) {}
    @Get('experience')
    experience(@Query() q: LocaleQueryDto) {
        return this.resume.experience(q.locale);
    }
    @Get('education')
    education(@Query() q: LocaleQueryDto) {
        return this.resume.education(q.locale);
    }
}

@Controller('skills')
export class SkillsPublicController {
    constructor(private readonly skills: SkillsService) {}
    @Get()
    list() {
        return this.skills.list();
    }
}

@Controller('pages')
export class PagesPublicController {
    constructor(private readonly pages: PagesService) {}
    @Get(':slug')
    bySlug(@Param('slug') slug: string, @Query() q: LocaleQueryDto) {
        return this.pages.bySlug(slug, q.locale);
    }
}

@Controller('preview')
@UseGuards(PreviewGuard)
export class ContentPreviewController {
    constructor(
        private readonly projects: ProjectsService,
        private readonly pages: PagesService,
    ) {}
    @Get('projects/:id')
    project(@Param('id') id: string, @Query() q: LocaleQueryDto) {
        return this.projects.detail({ id }, q.locale, true);
    }
    @Get('pages/:id')
    page(@Param('id') id: string, @Query() q: LocaleQueryDto) {
        return this.pages.detail(id, q.locale, true);
    }
}

// ── admin ───────────────────────────────────────────────────────────────────

@Controller('admin/profile')
@AdminAuth()
@AuditEntity('profile')
export class ProfileAdminController {
    constructor(private readonly profile: ProfileService) {}
    @Get()
    get() {
        return this.profile.adminGet();
    }
    @Patch()
    update(@Body() dto: UpdateProfileDto) {
        return this.profile.update(dto);
    }
    @Put('translations/:locale')
    translate(@Param('locale', LocaleParamPipe) locale: AppLocale, @Body() dto: ProfileTranslationDto) {
        return this.profile.upsertTranslation(locale, dto);
    }
    @Put('resume/:locale')
    setResume(@Param('locale', LocaleParamPipe) locale: AppLocale, @Body() dto: ResumeDto) {
        return this.profile.setResume(locale, dto.mediaId);
    }
    @Delete('resume/:locale')
    removeResume(@Param('locale', LocaleParamPipe) locale: AppLocale) {
        return this.profile.removeResume(locale);
    }
}

@Controller('admin/projects')
@AdminAuth()
@AuditEntity('project')
export class ProjectsAdminController {
    constructor(private readonly projects: ProjectsService) {}
    @Get()
    list() {
        return this.projects.adminList();
    }
    @Put('order')
    reorder(@Body() dto: ReorderDto) {
        return this.projects.reorder(dto.ids);
    }
    @Get(':id')
    get(@Param('id') id: string) {
        return this.projects.adminGet(id);
    }
    @Post()
    create(@Body() dto: CreateProjectDto) {
        return this.projects.create(dto);
    }
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
        return this.projects.update(id, dto);
    }
    @Put(':id/translations/:locale')
    translate(
        @Param('id') id: string,
        @Param('locale', LocaleParamPipe) locale: AppLocale,
        @Body() dto: ProjectTranslationDto,
    ) {
        return this.projects.upsertTranslation(id, locale, dto);
    }
    @Delete(':id/translations/:locale')
    removeTranslation(@Param('id') id: string, @Param('locale', LocaleParamPipe) locale: AppLocale) {
        return this.projects.removeTranslation(id, locale);
    }
    @Post(':id/publish')
    @HttpCode(HttpStatus.OK)
    publish(@Param('id') id: string) {
        return this.projects.setStatus(id, 'PUBLISHED');
    }
    @Post(':id/unpublish')
    @HttpCode(HttpStatus.OK)
    unpublish(@Param('id') id: string) {
        return this.projects.setStatus(id, 'DRAFT');
    }
    @Post(':id/archive')
    @HttpCode(HttpStatus.OK)
    archive(@Param('id') id: string) {
        return this.projects.setStatus(id, 'ARCHIVED');
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.projects.remove(id);
    }
}

@Controller('admin/experience')
@AdminAuth()
@AuditEntity('experience')
export class ExperienceAdminController {
    constructor(private readonly resume: ResumeService) {}
    @Get()
    list() {
        return this.resume.experienceAdminList();
    }
    @Put('order')
    reorder(@Body() dto: ReorderDto) {
        return this.resume.reorder('experience', dto.ids);
    }
    @Post()
    create(@Body() dto: CreateExperienceDto) {
        return this.resume.experienceCreate(dto);
    }
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateExperienceDto) {
        return this.resume.experienceUpdate(id, dto);
    }
    @Put(':id/translations/:locale')
    translate(
        @Param('id') id: string,
        @Param('locale', LocaleParamPipe) locale: AppLocale,
        @Body() dto: ExperienceTranslationDto,
    ) {
        return this.resume.experienceTranslate(id, locale, dto);
    }
    @Post(':id/publish')
    @HttpCode(HttpStatus.OK)
    publish(@Param('id') id: string) {
        return this.resume.setStatus('experience', id, 'PUBLISHED');
    }
    @Post(':id/unpublish')
    @HttpCode(HttpStatus.OK)
    unpublish(@Param('id') id: string) {
        return this.resume.setStatus('experience', id, 'DRAFT');
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.resume.remove('experience', id);
    }
}

@Controller('admin/education')
@AdminAuth()
@AuditEntity('education')
export class EducationAdminController {
    constructor(private readonly resume: ResumeService) {}
    @Get()
    list() {
        return this.resume.educationAdminList();
    }
    @Put('order')
    reorder(@Body() dto: ReorderDto) {
        return this.resume.reorder('education', dto.ids);
    }
    @Post()
    create(@Body() dto: CreateEducationDto) {
        return this.resume.educationCreate(dto);
    }
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateEducationDto) {
        return this.resume.educationUpdate(id, dto);
    }
    @Put(':id/translations/:locale')
    translate(
        @Param('id') id: string,
        @Param('locale', LocaleParamPipe) locale: AppLocale,
        @Body() dto: EducationTranslationDto,
    ) {
        return this.resume.educationTranslate(id, locale, dto);
    }
    @Post(':id/publish')
    @HttpCode(HttpStatus.OK)
    publish(@Param('id') id: string) {
        return this.resume.setStatus('education', id, 'PUBLISHED');
    }
    @Post(':id/unpublish')
    @HttpCode(HttpStatus.OK)
    unpublish(@Param('id') id: string) {
        return this.resume.setStatus('education', id, 'DRAFT');
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.resume.remove('education', id);
    }
}

@Controller('admin/skills')
@AdminAuth()
@AuditEntity('skill')
export class SkillsAdminController {
    constructor(private readonly skills: SkillsService) {}
    @Get()
    list() {
        return this.skills.list();
    }
    @Put('order')
    reorder(@Body() dto: ReorderDto) {
        return this.skills.reorder(dto.ids);
    }
    @Post()
    create(@Body() dto: SkillDto) {
        return this.skills.create(dto);
    }
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: SkillDto) {
        return this.skills.update(id, dto);
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.skills.remove(id);
    }
}

@Controller('admin/pages')
@AdminAuth()
@AuditEntity('page')
export class PagesAdminController {
    constructor(private readonly pages: PagesService) {}
    @Get()
    list() {
        return this.pages.adminList();
    }
    @Get(':id')
    get(@Param('id') id: string) {
        return this.pages.adminGet(id);
    }
    @Post()
    create(@Body() dto: CreatePageDto) {
        return this.pages.create(dto.key ?? '', dto.title);
    }
    @Put(':id/translations/:locale')
    translate(
        @Param('id') id: string,
        @Param('locale', LocaleParamPipe) locale: AppLocale,
        @Body() dto: PageTranslationDto,
    ) {
        return this.pages.upsertTranslation(id, locale, dto);
    }
    @Post(':id/publish')
    @HttpCode(HttpStatus.OK)
    publish(@Param('id') id: string) {
        return this.pages.setStatus(id, 'PUBLISHED');
    }
    @Post(':id/unpublish')
    @HttpCode(HttpStatus.OK)
    unpublish(@Param('id') id: string) {
        return this.pages.setStatus(id, 'DRAFT');
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pages.remove(id);
    }
}
