import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { ADMIN_COOKIES } from 'src/common/constants/admin';
import { THROTTLE } from 'src/common/constants/rateLimits';
import {
    AdminAuth,
    AdminDevice,
    AdminNavigation,
    AdminPublic,
    CurrentAdmin,
} from 'src/common/decorators/adminAuth.decorator';
import { RawResponse } from 'src/common/decorators/rawResponse.decorator';
import { StrictIpThrottle } from 'src/common/decorators/strictIpThrottle.decorator';
import { getClientIp, getUserAgent } from 'src/common/utils/request.util';
import { AdminAuthService, type ReqMeta } from './auth.service';
import type { AdminPrincipal } from './auth.types';
import {
    clearOauthCookie,
    clearPendingCookie,
    clearSessionCookies,
    setOauthCookie,
    setPendingCookie,
    setSessionCookies,
} from './cookies';
import { AdminLoginDto, TotpCodeDto, TotpVerifyDto } from './dto/auth.dto';
import { GoogleAuthService } from './google.service';
import { SessionService } from './session.service';

const AuthThrottle = () => Throttle({ default: { limit: THROTTLE.AUTH_LIMIT, ttl: THROTTLE.AUTH_TTL_MS } });

function cookie(req: Request, name: string): string | undefined {
    return (req.cookies as Record<string, string | undefined> | undefined)?.[name];
}

function meta(req: Request, device: string): ReqMeta {
    return { device, ip: getClientIp(req), userAgent: getUserAgent(req) };
}

/** Same-origin HTML bounce: a navigation that STARTED cross-site (Google) wouldn't carry SameSite=Strict cookies on a plain 302. */
function bounce(res: Response, path: string): void {
    const safe = path.replace(/[^a-zA-Z0-9/_?=&-]/g, '');
    res.status(200)
        .type('html')
        .setHeader('Cache-Control', 'no-store')
        .send(
            `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer">` +
                `<meta http-equiv="refresh" content="0;url=${safe}"><title>…</title></head>` +
                `<body><a href="${safe}">Continue</a></body></html>`,
        );
}

/**
 * Admin auth realm: `/v1/admin/auth/*`, reached in production only as
 * `https://admin.mehdisafarzade.dev/api/auth/*` through the nginx device gate.
 * Every handler carries an admin realm decorator (enforced by e2e).
 */
@Controller('admin/auth')
export class AdminAuthController {
    constructor(
        private readonly auth: AdminAuthService,
        private readonly sessions: SessionService,
        private readonly google: GoogleAuthService,
    ) {}

    @Get('config')
    @AdminPublic()
    config() {
        return { googleEnabled: this.google.enabled };
    }

    /** Where is this browser in the sign-in flow? (drives /login/totp vs /login/totp-setup) */
    @Get('pending')
    @AdminPublic()
    pending(@Req() req: Request, @AdminDevice() device: string) {
        try {
            const p = this.auth.readPending(cookie(req, ADMIN_COOKIES.PENDING), device);
            return { step: p.purpose === 'setup' ? 'totp-setup' : 'totp', via: p.via };
        } catch {
            return { step: null, via: null };
        }
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @AdminPublic()
    @StrictIpThrottle()
    @AuthThrottle()
    async login(
        @Body() dto: AdminLoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @AdminDevice() device: string,
    ) {
        const { step, pending } = await this.auth.passwordLogin(dto.email, dto.password, meta(req, device));
        setPendingCookie(res, pending);
        return { step };
    }

    @Post('totp/setup')
    @HttpCode(HttpStatus.OK)
    @AdminPublic()
    @StrictIpThrottle()
    @AuthThrottle()
    async totpSetup(@Req() req: Request, @AdminDevice() device: string) {
        const pending = this.auth.readPending(cookie(req, ADMIN_COOKIES.PENDING), device, 'setup');
        return this.auth.totpSetup(pending);
    }

    @Post('totp/enable')
    @HttpCode(HttpStatus.OK)
    @AdminPublic()
    @StrictIpThrottle()
    @AuthThrottle()
    async totpEnable(
        @Body() dto: TotpCodeDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @AdminDevice() device: string,
    ) {
        const pending = this.auth.readPending(cookie(req, ADMIN_COOKIES.PENDING), device, 'setup');
        const { issued, recoveryCodes } = await this.auth.totpEnable(pending, dto.code, meta(req, device));
        clearPendingCookie(res);
        setSessionCookies(res, issued);
        return { recoveryCodes };
    }

    @Post('totp/verify')
    @HttpCode(HttpStatus.OK)
    @AdminPublic()
    @StrictIpThrottle()
    @AuthThrottle()
    async totpVerify(
        @Body() dto: TotpVerifyDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @AdminDevice() device: string,
    ) {
        const pending = this.auth.readPending(cookie(req, ADMIN_COOKIES.PENDING), device, 'verify');
        const { issued, usedRecoveryCode, remainingRecoveryCodes } = await this.auth.totpVerify(
            pending,
            dto.code,
            meta(req, device),
        );
        clearPendingCookie(res);
        setSessionCookies(res, issued);
        return { usedRecoveryCode, remainingRecoveryCodes };
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @AdminPublic()
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @AdminDevice() device: string) {
        try {
            const issued = await this.auth.refresh(cookie(req, ADMIN_COOKIES.REFRESH), meta(req, device));
            setSessionCookies(res, issued);
            return { refreshed: true };
        } catch (err) {
            // A benign tab race keeps the cookies (the other tab's response already set fresh ones).
            if (!(err instanceof Error && err.message === 'i18n:auth.REFRESH_RACE')) clearSessionCookies(res);
            throw err;
        }
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @AdminAuth()
    async logout(
        @CurrentAdmin() admin: AdminPrincipal,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.auth.logout(admin, false, getClientIp(req));
        clearSessionCookies(res);
        return { message: 'auth.LOGGED_OUT' };
    }

    @Post('logout-all')
    @HttpCode(HttpStatus.OK)
    @AdminAuth()
    async logoutAll(
        @CurrentAdmin() admin: AdminPrincipal,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.auth.logout(admin, true, getClientIp(req));
        clearSessionCookies(res);
        return { message: 'auth.LOGGED_OUT' };
    }

    @Get('me')
    @AdminAuth()
    me(@CurrentAdmin() admin: AdminPrincipal) {
        return this.auth.me(admin);
    }

    @Get('sessions')
    @AdminAuth()
    async listSessions(@CurrentAdmin() admin: AdminPrincipal) {
        const rows = await this.sessions.listActive(admin.id);
        return rows.map((s) => ({ ...s, current: s.familyId === admin.familyId }));
    }

    @Delete('sessions/:id')
    @AdminAuth()
    async revokeSession(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string) {
        const rows = await this.sessions.listActive(admin.id);
        const target = rows.find((s) => s.id === id);
        if (!target) throw new NotFoundException();
        await this.sessions.revokeFamily(target.familyId);
        return { message: 'auth.SESSION_REVOKED' };
    }

    // ── Google (top-level navigations) ──────────────────────────────────────

    @Get('google')
    @AdminNavigation()
    @RawResponse()
    @StrictIpThrottle()
    @AuthThrottle()
    async googleStart(@Res() res: Response) {
        if (!this.google.enabled) return bounce(res, '/login?error=google_disabled');
        const state = randomBytes(24).toString('base64url');
        const { verifier, challenge } = await this.google.createPkce();
        setOauthCookie(res, JSON.stringify({ state, verifier }));
        res.setHeader('Cache-Control', 'no-store');
        res.redirect(302, this.google.authUrl(state, challenge));
    }

    @Get('google/callback')
    @AdminNavigation()
    @RawResponse()
    @StrictIpThrottle()
    @AuthThrottle()
    async googleCallback(
        @Req() req: Request,
        @Res() res: Response,
        @AdminDevice() device: string,
        @Query('state') receivedState?: string,
        @Query('code') code?: string,
        @Query('error') error?: string,
    ) {
        let expected: { state?: string; verifier?: string } = {};
        try {
            expected = JSON.parse(cookie(req, ADMIN_COOKIES.OAUTH) ?? '{}') as typeof expected;
        } catch {
            /* treated as missing state */
        }
        clearOauthCookie(res);
        if (error) return bounce(res, '/login?error=google_cancelled');

        const result = await this.auth.googleLogin(
            { expected: expected.state, received: receivedState, verifier: expected.verifier },
            code,
            meta(req, device),
        );
        if (!result.ok) return bounce(res, `/login?error=${result.error}`);
        setPendingCookie(res, result.pending);
        return bounce(res, result.step === 'totp' ? '/login/totp' : '/login/totp-setup');
    }
}
