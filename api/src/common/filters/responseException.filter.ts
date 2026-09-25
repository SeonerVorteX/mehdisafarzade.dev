import { Catch, HttpException, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { Response } from 'express';
import { I18nContext, I18nValidationException } from 'nestjs-i18n';
import { IS_PRODUCTION } from '../constants/env';
import { resolveLocale } from '../constants/locales';
import { isI18nKeyString, stripPrefix } from '../utils/i18n.util';
import { winstonLogger } from '../utils/logger.util';

export type ApiErrorItem = {
    code: string;
    message: string;
    scope: 'validation' | 'domain';
    field?: string;
    fields?: string[];
};

export type ErrorEnvelope = { ok: false; errors: ApiErrorItem[]; locale: string };

/** Body shape for domain errors: `throw new BadRequestException({ i18nKey, args?, fields?, code? })`. */
export type DomainErrorBody = { i18nKey: string; args?: Record<string, unknown>; fields?: string[]; code?: string };

type Translate = (key: string, opts?: { lang?: string; args?: Record<string, unknown> }) => string;

const STATUS_CODES: Partial<Record<number, string>> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    429: 'TOO_MANY_REQUESTS',
    503: 'SERVICE_UNAVAILABLE',
};

/** class-validator constraint name → our i18n key, for constraints that don't carry an i18n message. */
const BUILTIN_CONSTRAINTS: Record<string, string> = {
    whitelistValidation: 'validation.NOT_ALLOWED',
};

function lastSegment(key: string): string {
    const parts = stripPrefix(key).split('.');
    return parts.length > 1 ? parts.slice(1).join('.') : parts[0];
}

/** nestjs-i18n encodes validation messages as `key|{"json":"args"}`. */
function translateValidation(raw: string, field: string, t: Translate | undefined, lang: string) {
    const [keyPart, argJson] = raw.split('|', 2);
    const key = keyPart.trim();
    let args: Record<string, unknown> = {};
    if (argJson) {
        try {
            args = JSON.parse(argJson) as Record<string, unknown>;
        } catch {
            /* keep empty */
        }
    }
    const leaf = field.split(/[.[]/)[0];
    const property = t?.(`properties.${leaf}`, { lang }) ?? leaf;
    const propertyText = property === `properties.${leaf}` ? leaf : property;
    args.property = propertyText;
    args.Property = propertyText.charAt(0).toUpperCase() + propertyText.slice(1);
    return { code: lastSegment(key), message: t?.(key, { lang, args }) ?? key };
}

function flattenValidation(
    errors: ValidationError[],
    t: Translate | undefined,
    lang: string,
    parent = '',
): ApiErrorItem[] {
    const out: ApiErrorItem[] = [];
    for (const err of errors) {
        const seg = String(err.property ?? '');
        const field = !parent ? seg : /^\d+$/.test(seg) ? `${parent}[${seg}]` : `${parent}.${seg}`;
        for (const [name, raw] of Object.entries(err.constraints ?? {})) {
            const source = BUILTIN_CONSTRAINTS[name] ?? raw;
            const { code, message } = isI18nKeyString(source.split('|')[0])
                ? translateValidation(source, field, t, lang)
                : { code: name.toUpperCase(), message: source };
            out.push({ code, message, scope: 'validation', field });
        }
        if (err.children?.length) out.push(...flattenValidation(err.children, t, lang, field));
    }
    return out;
}

/**
 * Every error becomes `{ ok: false, errors: [{ code, message, scope, field? }], locale }`,
 * the Examination ResponseExceptionFilter contract the frontend fetcher parses.
 * Unexpected errors are logged with their stack and returned as a generic
 * `UNKNOWN` (message detail only outside production).
 */
@Catch()
export class ResponseExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        if (host.getType() !== 'http') throw exception;

        const res = host.switchToHttp().getResponse<Response>();
        const i18n = I18nContext.current(host);
        const t: Translate | undefined = i18n ? (key, opts) => i18n.t(key, opts) : undefined;
        const locale = resolveLocale(i18n?.lang);

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let errors: ApiErrorItem[];

        if (exception instanceof I18nValidationException) {
            status = HttpStatus.BAD_REQUEST;
            errors = flattenValidation(exception.errors ?? [], t, locale);
        } else if (exception instanceof HttpException) {
            status = exception.getStatus();
            errors = [this.fromHttpException(exception, status, t, locale)];
        } else {
            const err = exception instanceof Error ? exception : new Error(String(exception));
            winstonLogger.error(`Unhandled exception: ${err.message}`, {
                context: 'ExceptionFilter',
                stack: err.stack,
            });
            errors = [
                {
                    code: 'UNKNOWN',
                    message: IS_PRODUCTION ? (t?.('error.UNKNOWN', { lang: locale }) ?? 'Unknown error') : err.message,
                    scope: 'domain',
                },
            ];
        }

        if (!res.headersSent) res.status(status).json({ ok: false, errors, locale } satisfies ErrorEnvelope);
    }

    private fromHttpException(ex: HttpException, status: number, t: Translate | undefined, lang: string): ApiErrorItem {
        const body = ex.getResponse();
        const fallbackCode = STATUS_CODES[status] ?? 'UNKNOWN';
        const translate = (key: string, args?: Record<string, unknown>) => t?.(stripPrefix(key), { lang, args }) ?? key;

        // throw new XException('i18n:ns.KEY')
        if (typeof body === 'string') {
            return isI18nKeyString(body)
                ? { code: lastSegment(body), message: translate(body), scope: 'domain' }
                : { code: fallbackCode, message: body, scope: 'domain' };
        }

        const obj = body as Partial<DomainErrorBody> & { message?: unknown };
        // throw new XException({ i18nKey, args, fields, code })
        if (typeof obj.i18nKey === 'string') {
            return {
                code: obj.code ?? lastSegment(obj.i18nKey),
                message: translate(obj.i18nKey, obj.args),
                scope: 'domain',
                ...(obj.fields ? { fields: obj.fields } : {}),
            };
        }
        // Nest built-ins: { statusCode, message, error }
        const msg = Array.isArray(obj.message)
            ? String(obj.message[0])
            : typeof obj.message === 'string'
              ? obj.message
              : '';
        if (isI18nKeyString(msg)) return { code: lastSegment(msg), message: translate(msg), scope: 'domain' };
        return { code: fallbackCode, message: translate(`error.${fallbackCode}`), scope: 'domain' };
    }
}
