import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsDateString,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { SearchQueryDto } from 'src/common/dto/query.dto';
import { LOCALES } from 'src/common/constants/locales';
import { SLUG_PATTERN } from 'src/common/utils/content.util';

const msg = (k: string) => ({ message: i18nValidationMessage(`validation.${k}`) });
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SlugField {
    @IsOptional()
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(96, msg('MAX_LENGTH'))
    @Matches(SLUG_PATTERN, msg('MATCHES'))
    slug?: string;
}

export class SeoFields extends SlugField {
    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(70, msg('MAX_LENGTH'))
    seoTitle?: string | null;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(170, msg('MAX_LENGTH'))
    seoDescription?: string | null;
}

export class ScheduleDto {
    @IsDateString({}, msg('IS_STRING'))
    scheduledAt!: string;
}

export class ReorderDto {
    @IsArray()
    @ArrayMaxSize(500)
    @IsString({ each: true })
    ids!: string[];
}

export class AdminListQueryDto extends SearchQueryDto {
    @IsOptional()
    @IsIn(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'], msg('IS_ENUM'))
    status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

    /** Only rows whose translation in this locale is incomplete. */
    @IsOptional()
    @IsIn(LOCALES, msg('IS_ENUM'))
    incomplete?: (typeof LOCALES)[number];
}

// ── posts ─────────────────────────────────────────────────────────────────

export class PostTranslationDto extends SeoFields {
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(200, msg('MAX_LENGTH'))
    title!: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(400, msg('MAX_LENGTH'))
    excerpt?: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(200_000, msg('MAX_LENGTH'))
    bodyMarkdown?: string;
}

export class PostBaseDto {
    @IsOptional()
    @IsBoolean(msg('IS_BOOLEAN'))
    featured?: boolean;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    coverMediaId?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    tagIds?: string[];
}

export class TagTranslationDto extends SlugField {
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(60, msg('MAX_LENGTH'))
    name!: string;
}

// ── projects ──────────────────────────────────────────────────────────────

export class ProjectTranslationDto {
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(200, msg('MAX_LENGTH'))
    title!: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(600, msg('MAX_LENGTH'))
    summary?: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(200_000, msg('MAX_LENGTH'))
    caseStudyMarkdown?: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(120, msg('MAX_LENGTH'))
    role?: string | null;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(70, msg('MAX_LENGTH'))
    seoTitle?: string | null;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(170, msg('MAX_LENGTH'))
    seoDescription?: string | null;
}

export class ProjectBaseDto extends SlugField {
    @IsOptional()
    @IsBoolean(msg('IS_BOOLEAN'))
    featured?: boolean;

    @IsOptional()
    @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, msg('IS_URL'))
    repoUrl?: string | null;

    @IsOptional()
    @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, msg('IS_URL'))
    liveUrl?: string | null;

    @IsOptional()
    @IsDateString({}, msg('IS_STRING'))
    startedAt?: string | null;

    @IsOptional()
    @IsDateString({}, msg('IS_STRING'))
    endedAt?: string | null;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    coverMediaId?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(40)
    @IsString({ each: true })
    skillIds?: string[];

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(40)
    @IsString({ each: true })
    galleryMediaIds?: string[];
}

// ── experience / education ────────────────────────────────────────────────

export class ExperienceBaseDto {
    @IsOptional()
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(120, msg('MAX_LENGTH'))
    org?: string;

    @IsOptional()
    @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, msg('IS_URL'))
    orgUrl?: string | null;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(120, msg('MAX_LENGTH'))
    location?: string | null;

    @IsOptional()
    @IsDateString({}, msg('IS_STRING'))
    startedAt?: string;

    @IsOptional()
    @IsDateString({}, msg('IS_STRING'))
    endedAt?: string | null;
}

export class ExperienceTranslationDto {
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(160, msg('MAX_LENGTH'))
    title!: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(1000, msg('MAX_LENGTH'))
    summary?: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(20_000, msg('MAX_LENGTH'))
    bulletsMarkdown?: string;
}

export class EducationBaseDto {
    @IsOptional()
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(160, msg('MAX_LENGTH'))
    institution?: string;

    @IsOptional()
    @IsUrl({ protocols: ['https', 'http'], require_protocol: true }, msg('IS_URL'))
    url?: string | null;

    @IsOptional()
    @IsDateString({}, msg('IS_STRING'))
    startedAt?: string;

    @IsOptional()
    @IsDateString({}, msg('IS_STRING'))
    endedAt?: string | null;
}

export class EducationTranslationDto {
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(160, msg('MAX_LENGTH'))
    degree!: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(1000, msg('MAX_LENGTH'))
    summary?: string;
}

// ── skills ────────────────────────────────────────────────────────────────

export class SkillDto {
    @IsOptional()
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(60, msg('MAX_LENGTH'))
    name?: string;

    @IsOptional()
    @IsIn(['LANGUAGE', 'FRAMEWORK', 'DATA', 'CLOUD_DEVOPS', 'TOOLING', 'SOFT'], msg('IS_ENUM'))
    category?: 'LANGUAGE' | 'FRAMEWORK' | 'DATA' | 'CLOUD_DEVOPS' | 'TOOLING' | 'SOFT';

    @IsOptional()
    @Type(() => Number)
    @IsInt(msg('IS_INT'))
    @Min(0)
    level?: number | null;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(60, msg('MAX_LENGTH'))
    icon?: string | null;

    @IsOptional()
    @IsBoolean(msg('IS_BOOLEAN'))
    featured?: boolean;
}

// ── pages ─────────────────────────────────────────────────────────────────

export class PageTranslationDto extends SeoFields {
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(160, msg('MAX_LENGTH'))
    title!: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(200_000, msg('MAX_LENGTH'))
    bodyMarkdown?: string;
}

export class PageBaseDto {
    @IsOptional()
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(60, msg('MAX_LENGTH'))
    @Matches(SLUG_PATTERN, msg('MATCHES'))
    key?: string;
}

// ── profile ───────────────────────────────────────────────────────────────

export class ProfileBaseDto {
    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(254, msg('MAX_LENGTH'))
    email?: string;

    @IsOptional()
    @IsBoolean(msg('IS_BOOLEAN'))
    availableForWork?: boolean;

    /** { github, linkedin, upwork, … }: URL values; a "<PLACEHOLDER>" is kept but hidden publicly. */
    @IsOptional()
    socials?: Record<string, string>;
}

export class ProfileTranslationDto {
    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(120, msg('MAX_LENGTH'))
    name!: string;

    @Transform(trim)
    @IsString(msg('IS_STRING'))
    @MaxLength(160, msg('MAX_LENGTH'))
    headline!: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(600, msg('MAX_LENGTH'))
    pitch?: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(20_000, msg('MAX_LENGTH'))
    bioMarkdown?: string;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(70, msg('MAX_LENGTH'))
    seoTitle?: string | null;

    @IsOptional()
    @IsString(msg('IS_STRING'))
    @MaxLength(170, msg('MAX_LENGTH'))
    seoDescription?: string | null;
}

export class ResumeDto {
    @IsString(msg('IS_STRING'))
    mediaId!: string;
}
