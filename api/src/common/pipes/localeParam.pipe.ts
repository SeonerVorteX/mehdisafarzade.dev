import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { isAppLocale, type AppLocale } from '../constants/locales';

/** Route param `:locale` must be az | en | ru. */
@Injectable()
export class LocaleParamPipe implements PipeTransform<string, AppLocale> {
    transform(value: string): AppLocale {
        if (!isAppLocale(value))
            throw new BadRequestException({ i18nKey: 'content.UNKNOWN_LOCALE', fields: ['locale'] });
        return value;
    }
}
