import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { DEFAULT_LOCALE, LOCALES, type AppLocale } from '../constants/locales';

export class LocaleQueryDto {
    @IsOptional()
    @IsIn(LOCALES, { message: i18nValidationMessage('validation.IS_ENUM') })
    locale: AppLocale = DEFAULT_LOCALE;
}

export class PaginationQueryDto extends LocaleQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
    @Min(1)
    @Max(50)
    pageSize: number = 10;
}

export class SearchQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
    q?: string;
}

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

export function toPage<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
    return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
