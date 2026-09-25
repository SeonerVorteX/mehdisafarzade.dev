import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nContext } from 'nestjs-i18n';
import { map, type Observable } from 'rxjs';
import { resolveLocale } from '../constants/locales';
import { RAW_RESPONSE_KEY } from '../decorators/rawResponse.decorator';
import { isI18nKeyString, stripPrefix } from '../utils/i18n.util';

export type SuccessEnvelope<T> = { ok: true; data: T; locale: string };

/**
 * Wraps every HTTP response in `{ ok: true, data, locale }` (Examination's
 * ResponseInterceptor). A `message` field holding an i18n key (`'i18n:ns.KEY'`
 * or `'ns.KEY'`) is translated into the request's locale.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T> | T> {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T> | T> {
        if (context.getType() !== 'http') return next.handle();
        const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (raw) return next.handle();

        return next.handle().pipe(
            map((data) => {
                const i18n = I18nContext.current(context);
                const locale = resolveLocale(i18n?.lang);
                if (data && typeof data === 'object' && 'message' in data) {
                    const msg = (data as { message?: unknown }).message;
                    if (isI18nKeyString(msg)) {
                        (data as { message?: unknown }).message = i18n?.t(stripPrefix(msg), { lang: locale }) ?? msg;
                    }
                }
                return { ok: true as const, data, locale };
            }),
        );
    }
}
