import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationQueryDto } from 'src/common/dto/query.dto';
import { MEDIA_MIMES } from '../media.constants';

export class PresignMediaDto {
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    @MinLength(1, { message: i18nValidationMessage('validation.NOT_EMPTY') })
    @MaxLength(200, { message: i18nValidationMessage('validation.MAX_LENGTH') })
    filename!: string;

    @IsIn(MEDIA_MIMES, { message: i18nValidationMessage('validation.IS_ENUM') })
    mime!: string;

    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('validation.IS_INT') })
    @Min(1)
    size!: number;
}

export class MediaTranslationDto {
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    @MaxLength(300, { message: i18nValidationMessage('validation.MAX_LENGTH') })
    alt!: string;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    @MaxLength(500, { message: i18nValidationMessage('validation.MAX_LENGTH') })
    caption?: string | null;
}

export class MediaListQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsIn(['PENDING', 'READY', 'FAILED'])
    status?: 'PENDING' | 'READY' | 'FAILED';
}
