import { ValidationPipe, type ArgumentMetadata, type ValidationPipeOptions } from '@nestjs/common';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';

/**
 * Global validation pipe. Behaves like nestjs-i18n's I18nValidationPipe as
 * Examination uses it (10.5), with one difference: it always throws the
 * UNTRANSLATED `key|{args}` constraints.
 *
 * nestjs-i18n ≥10.8 translates inside its own exception factory whenever a
 * request context exists, and passes only the raw property name, so
 * `{Property}` renders empty ("must be at most 5 characters"). Keeping the raw
 * keys lets ResponseExceptionFilter translate with localized property names
 * (`properties.<field>`) and emit stable `code`s like `MAX_LENGTH`.
 */
export class AppValidationPipe extends ValidationPipe {
    constructor(options: Omit<ValidationPipeOptions, 'exceptionFactory'> = {}) {
        super({ ...options, exceptionFactory: (errors) => new I18nValidationException(errors) });
    }

    protected override toValidate(metadata: ArgumentMetadata): boolean {
        return metadata.metatype !== I18nContext && super.toValidate(metadata);
    }
}
