import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class AdminLoginDto {
    @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
    @MaxLength(254, { message: i18nValidationMessage('validation.MAX_LENGTH') })
    email!: string;

    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    @IsNotEmpty({ message: i18nValidationMessage('validation.NOT_EMPTY') })
    @MaxLength(256, { message: i18nValidationMessage('validation.MAX_LENGTH') })
    password!: string;
}

/** A 6-digit authenticator code (enrollment confirmation). */
export class TotpCodeDto {
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    @Matches(/^\d{6}$/, { message: i18nValidationMessage('validation.MATCHES') })
    code!: string;
}

/** A 6-digit authenticator code OR a recovery code (`xxxxx-xxxxx`). */
export class TotpVerifyDto {
    @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
    @IsNotEmpty({ message: i18nValidationMessage('validation.NOT_EMPTY') })
    @MaxLength(32, { message: i18nValidationMessage('validation.MAX_LENGTH') })
    code!: string;
}
