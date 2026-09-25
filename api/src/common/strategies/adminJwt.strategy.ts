import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SessionService } from 'src/api/admin/auth/session.service';
import type { AccessTokenPayload, AdminPrincipal, AdminRequest } from 'src/api/admin/auth/auth.types';
import { ADMIN_COOKIES, ADMIN_JWT } from '../constants/admin';
import { ADMIN_AUTH } from '../constants/env';

const fromAccessCookie = (req: Request): string | null =>
    (req?.cookies as Record<string, string | undefined> | undefined)?.[ADMIN_COOKIES.ACCESS] ?? null;

/**
 * Passport strategy for the admin realm (separate from any future public auth,
 * like Examination's separate admin realm). Reads the access JWT from its
 * httpOnly cookie, then checks that:
 *  - the session (`sid`) is still valid (revocation takes effect within the cache TTL),
 *  - the token's device equals the X-Admin-Device nginx set for THIS request
 *    (a token lifted from one device is useless from another).
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
    constructor(private readonly sessions: SessionService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([fromAccessCookie]),
            secretOrKey: ADMIN_AUTH.jwtSecret,
            issuer: ADMIN_JWT.ISSUER,
            audience: ADMIN_JWT.AUDIENCE,
            algorithms: ['HS256'],
            passReqToCallback: true,
        });
    }

    async validate(req: AdminRequest, payload: AccessTokenPayload): Promise<AdminPrincipal> {
        if (!req.adminDevice || payload.dev !== req.adminDevice) {
            throw new UnauthorizedException('i18n:auth.DEVICE_MISMATCH');
        }
        const principal = await this.sessions.resolveAccess(payload);
        if (!principal) throw new UnauthorizedException('i18n:auth.SESSION_EXPIRED');
        return principal;
    }
}
