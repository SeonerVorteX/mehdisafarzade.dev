import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { ADMIN_COOKIES } from '../constants/admin';
import { ADMIN_ORIGIN } from '../constants/env';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** The request's Origin (or, when a browser omits it, Sec-Fetch-Site) must say "same origin as the admin host". */
export function isSameOriginRequest(req: Request): boolean {
    const origin = req.headers.origin;
    if (origin) return origin === ADMIN_ORIGIN;
    return req.headers['sec-fetch-site'] === 'same-origin';
}

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Origin check for unsafe methods on pre-auth admin routes (login, TOTP,
 * refresh), which carry no session yet. Blocks login CSRF.
 */
@Injectable()
export class AdminOriginGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<Request>();
        if (SAFE_METHODS.has(req.method)) return true;
        if (!isSameOriginRequest(req)) throw new ForbiddenException('i18n:auth.CSRF');
        return true;
    }
}

/**
 * CSRF for cookie-authenticated admin mutations (brief §6): SameSite=Strict
 * cookies, plus an Origin check, plus a double-submit token (`__Host-pf_csrf`
 * cookie echoed in `X-CSRF-Token`). The `__Host-` prefix means no sibling
 * subdomain can plant the cookie.
 */
@Injectable()
export class AdminCsrfGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<Request>();
        if (SAFE_METHODS.has(req.method)) return true;
        if (!isSameOriginRequest(req)) throw new ForbiddenException('i18n:auth.CSRF');
        const cookie = (req.cookies as Record<string, string | undefined>)?.[ADMIN_COOKIES.CSRF];
        const header = req.headers['x-csrf-token'];
        const value = Array.isArray(header) ? header[0] : header;
        if (!cookie || !value || !safeEqual(cookie, value)) throw new ForbiddenException('i18n:auth.CSRF');
        return true;
    }
}
