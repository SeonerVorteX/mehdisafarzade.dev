import type { CookieOptions, Response } from 'express';
import { ADMIN_COOKIES, ADMIN_TTL } from 'src/common/constants/admin';
import type { IssuedSession } from './session.service';

/** `__Host-` prefix requirements: Secure, Path=/, no Domain (host-only on the admin host). */
const hostOnly = (sameSite: 'strict' | 'lax', httpOnly: boolean, maxAgeS: number): CookieOptions => ({
    secure: true,
    path: '/',
    httpOnly,
    sameSite,
    maxAge: maxAgeS * 1000,
});

export function setSessionCookies(res: Response, issued: IssuedSession): void {
    res.cookie(ADMIN_COOKIES.ACCESS, issued.accessToken, hostOnly('strict', true, ADMIN_TTL.ACCESS_S));
    res.cookie(ADMIN_COOKIES.REFRESH, issued.refreshToken, hostOnly('strict', true, ADMIN_TTL.REFRESH_S));
    res.cookie(ADMIN_COOKIES.CSRF, issued.csrfToken, hostOnly('strict', false, ADMIN_TTL.REFRESH_S));
}

export function clearSessionCookies(res: Response): void {
    for (const name of [ADMIN_COOKIES.ACCESS, ADMIN_COOKIES.REFRESH, ADMIN_COOKIES.CSRF]) {
        res.clearCookie(name, { secure: true, path: '/', sameSite: 'strict' });
    }
}

export function setPendingCookie(res: Response, token: string): void {
    res.cookie(ADMIN_COOKIES.PENDING, token, hostOnly('strict', true, ADMIN_TTL.PENDING_S));
}

export function clearPendingCookie(res: Response): void {
    res.clearCookie(ADMIN_COOKIES.PENDING, { secure: true, path: '/', sameSite: 'strict' });
}
