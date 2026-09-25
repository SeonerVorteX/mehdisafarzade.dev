import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminJwtGuard extends AuthGuard('admin-jwt') {
    // Normalise every passport failure (missing/expired/forged token) into our envelope's i18n error.
    override handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
        if (err instanceof UnauthorizedException) throw err;
        if (err || !user) throw new UnauthorizedException('i18n:auth.UNAUTHORIZED');
        return user;
    }
}
