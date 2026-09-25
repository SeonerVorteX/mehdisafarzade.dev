import { ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AdminUser } from '@prisma/client';
import * as argon from 'argon2';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { ADMIN_JWT, ADMIN_TTL } from 'src/common/constants/admin';
import { ADMIN_AUTH } from 'src/common/constants/env';
import { AuditService } from 'src/common/helpers/audit/audit.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { AdminLockoutService } from './adminLockout.service';
import type { AdminPrincipal, PendingPurpose, PendingTokenPayload } from './auth.types';
import { GoogleAuthService } from './google.service';
import { SessionService, type IssuedSession } from './session.service';
import { looksLikeRecoveryCode, normalizeRecoveryCode, TotpService } from './totp.service';

export type ReqMeta = { device: string; ip?: string; userAgent?: string };
export type LoginStep = 'totp' | 'totp-setup';

/** Burns the same argon2 work for unknown emails so response time doesn't reveal which accounts exist. */
const DUMMY_HASH_PROMISE = argon.hash(randomBytes(16).toString('hex'), { type: argon.argon2id });

const lockedError = () => new HttpException('i18n:auth.ACCOUNT_LOCKED', HttpStatus.TOO_MANY_REQUESTS);

/**
 * Admin sign-in state machine (PLAN §8.3, decisions in §0):
 *
 *   password ──┐                    ┌─ TOTP enrolled ────► pending(verify) ─► totp/verify ─┐
 *              ├─► active admin? ───┤                                                    ├─► session
 *   google ────┘  (+ allowlist)     └─ not enrolled ─────► pending(setup) ─► setup+enable┘   (+ recovery codes once)
 *
 * No session of any kind exists before TOTP is enrolled and verified.
 */
@Injectable()
export class AdminAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly sessions: SessionService,
        private readonly totp: TotpService,
        private readonly lockout: AdminLockoutService,
        private readonly google: GoogleAuthService,
        private readonly audit: AuditService,
    ) {}

    // ── password step ────────────────────────────────────────────────────────

    async passwordLogin(email: string, password: string, meta: ReqMeta): Promise<{ step: LoginStep; pending: string }> {
        if (await this.lockout.isPasswordLocked(email)) throw lockedError();

        const admin = await this.prisma.adminUser.findUnique({ where: { email } });
        const ok = admin
            ? await argon.verify(admin.passwordHash, password)
            : await argon.verify(await DUMMY_HASH_PROMISE, password).then(() => false);

        if (!admin || !ok || admin.disabledAt) {
            await this.lockout.recordPasswordFailure(email);
            this.audit.log({
                action: 'auth.password_failed',
                entity: 'admin_user',
                entityId: admin?.id,
                deviceName: meta.device,
                ip: meta.ip,
            });
            throw new UnauthorizedException('i18n:auth.INVALID_CREDENTIALS');
        }
        await this.lockout.clearPassword(email);
        return this.startSecondFactor(admin, 'password', meta);
    }

    private startSecondFactor(admin: AdminUser, via: 'password' | 'google', meta: ReqMeta) {
        const step: LoginStep = admin.totpEnabledAt ? 'totp' : 'totp-setup';
        const purpose: PendingPurpose = admin.totpEnabledAt ? 'verify' : 'setup';
        const pending = this.jwt.sign({ sub: admin.id, purpose, dev: meta.device, via } satisfies PendingTokenPayload, {
            secret: ADMIN_AUTH.pendingJwtSecret,
            expiresIn: ADMIN_TTL.PENDING_S,
            issuer: ADMIN_JWT.ISSUER,
            audience: ADMIN_JWT.PENDING_AUDIENCE,
            algorithm: 'HS256',
        });
        this.audit.log({
            action: `auth.${via}_ok`,
            entity: 'admin_user',
            entityId: admin.id,
            deviceName: meta.device,
            ip: meta.ip,
        });
        return { step, pending };
    }

    /** Decodes the pending cookie; it must belong to this device and be for the expected step. */
    readPending(token: string | undefined, device: string, expected?: PendingPurpose): PendingTokenPayload {
        if (!token) throw new UnauthorizedException('i18n:auth.PENDING_EXPIRED');
        let payload: PendingTokenPayload;
        try {
            payload = this.jwt.verify<PendingTokenPayload>(token, {
                secret: ADMIN_AUTH.pendingJwtSecret,
                issuer: ADMIN_JWT.ISSUER,
                audience: ADMIN_JWT.PENDING_AUDIENCE,
                algorithms: ['HS256'],
            });
        } catch {
            throw new UnauthorizedException('i18n:auth.PENDING_EXPIRED');
        }
        if (payload.dev !== device) throw new UnauthorizedException('i18n:auth.DEVICE_MISMATCH');
        if (expected && payload.purpose !== expected) throw new ForbiddenException('i18n:auth.WRONG_STEP');
        return payload;
    }

    private async activeAdmin(id: string): Promise<AdminUser> {
        const admin = await this.prisma.adminUser.findUnique({ where: { id } });
        if (!admin || admin.disabledAt) throw new UnauthorizedException('i18n:auth.PENDING_EXPIRED');
        return admin;
    }

    // ── TOTP enrollment ──────────────────────────────────────────────────────

    async totpSetup(pending: PendingTokenPayload) {
        const admin = await this.activeAdmin(pending.sub);
        if (admin.totpEnabledAt) throw new ForbiddenException('i18n:auth.TOTP_ALREADY_ENABLED');
        // Reuse the secret until enrollment completes, so reloading the page doesn't invalidate a scanned QR.
        let secret = admin.totpSecretEnc ? this.totp.open(admin.totpSecretEnc) : null;
        if (!secret) {
            secret = this.totp.newSecret();
            await this.prisma.adminUser.update({
                where: { id: admin.id },
                data: { totpSecretEnc: this.totp.seal(secret) },
            });
        }
        return { otpauthUrl: this.totp.otpauthUrl(admin.email, secret), secret, account: admin.email };
    }

    async totpEnable(pending: PendingTokenPayload, code: string, meta: ReqMeta) {
        const admin = await this.activeAdmin(pending.sub);
        if (admin.totpEnabledAt) throw new ForbiddenException('i18n:auth.TOTP_ALREADY_ENABLED');
        if (!admin.totpSecretEnc) throw new ForbiddenException('i18n:auth.WRONG_STEP');
        if (await this.lockout.isTotpLocked(admin.id)) throw lockedError();

        if (!(await this.totp.verify(admin.id, this.totp.open(admin.totpSecretEnc), code))) {
            await this.lockout.recordTotpFailure(admin.id);
            this.audit.log({
                action: 'auth.totp_failed',
                entity: 'admin_user',
                entityId: admin.id,
                deviceName: meta.device,
                ip: meta.ip,
            });
            throw new UnauthorizedException('i18n:auth.INVALID_CODE');
        }
        await this.lockout.clearTotp(admin.id);

        const { codes, hashes } = await this.totp.generateRecoveryCodes();
        await this.prisma.$transaction([
            this.prisma.adminRecoveryCode.deleteMany({ where: { adminId: admin.id } }),
            this.prisma.adminRecoveryCode.createMany({
                data: hashes.map((codeHash) => ({ adminId: admin.id, codeHash })),
            }),
            this.prisma.adminUser.update({ where: { id: admin.id }, data: { totpEnabledAt: new Date() } }),
        ]);
        this.audit.log({
            action: 'auth.totp_enrolled',
            entity: 'admin_user',
            entityId: admin.id,
            deviceName: meta.device,
            ip: meta.ip,
        });
        const issued = await this.finishLogin(admin, pending.via, meta);
        return { issued, recoveryCodes: codes };
    }

    // ── TOTP / recovery-code verification ───────────────────────────────────

    async totpVerify(pending: PendingTokenPayload, input: string, meta: ReqMeta) {
        const admin = await this.activeAdmin(pending.sub);
        if (!admin.totpEnabledAt || !admin.totpSecretEnc) throw new ForbiddenException('i18n:auth.WRONG_STEP');
        if (await this.lockout.isTotpLocked(admin.id)) throw lockedError();

        const code = input.trim();
        let usedRecoveryCode = false;
        let ok = false;
        if (/^\d{6}$/.test(code)) {
            ok = await this.totp.verify(admin.id, this.totp.open(admin.totpSecretEnc), code);
        } else if (looksLikeRecoveryCode(code)) {
            ok = usedRecoveryCode = await this.consumeRecoveryCode(admin.id, code);
        }
        if (!ok) {
            await this.lockout.recordTotpFailure(admin.id);
            this.audit.log({
                action: 'auth.totp_failed',
                entity: 'admin_user',
                entityId: admin.id,
                deviceName: meta.device,
                ip: meta.ip,
            });
            throw new UnauthorizedException('i18n:auth.INVALID_CODE');
        }
        await this.lockout.clearTotp(admin.id);
        if (usedRecoveryCode) {
            this.audit.log({
                action: 'auth.recovery_code_used',
                entity: 'admin_user',
                entityId: admin.id,
                deviceName: meta.device,
                ip: meta.ip,
            });
        }
        const issued = await this.finishLogin(admin, pending.via, meta);
        const remainingRecoveryCodes = await this.prisma.adminRecoveryCode.count({
            where: { adminId: admin.id, usedAt: null },
        });
        return { issued, usedRecoveryCode, remainingRecoveryCodes };
    }

    private async consumeRecoveryCode(adminId: string, input: string): Promise<boolean> {
        const normalized = normalizeRecoveryCode(input);
        const candidates = await this.prisma.adminRecoveryCode.findMany({ where: { adminId, usedAt: null } });
        for (const c of candidates) {
            if (await argon.verify(c.codeHash, normalized)) {
                // Conditional update: a code can be spent exactly once even under concurrency.
                const spent = await this.prisma.adminRecoveryCode.updateMany({
                    where: { id: c.id, usedAt: null },
                    data: { usedAt: new Date() },
                });
                return spent.count === 1;
            }
        }
        return false;
    }

    private async finishLogin(admin: AdminUser, via: 'password' | 'google', meta: ReqMeta): Promise<IssuedSession> {
        const issued = await this.sessions.create(admin, meta.device, meta);
        await this.prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
        this.audit.log({
            action: 'auth.login_success',
            entity: 'admin_user',
            entityId: admin.id,
            adminId: admin.id,
            deviceName: meta.device,
            ip: meta.ip,
            diff: { via, sessionId: issued.session.id },
        });
        return issued;
    }

    // ── refresh / logout / me ───────────────────────────────────────────────

    async refresh(refreshToken: string | undefined, meta: ReqMeta): Promise<IssuedSession> {
        if (!refreshToken) throw new UnauthorizedException('i18n:auth.SESSION_EXPIRED');
        const result = await this.sessions.rotate(refreshToken, meta.device, meta);
        if (result.ok) return result.issued;
        if (result.reason === 'reuse' || result.reason === 'device') {
            this.audit.log({
                action: result.reason === 'reuse' ? 'auth.refresh_reuse_detected' : 'auth.refresh_device_mismatch',
                entity: 'admin_session',
                adminId: result.adminId,
                deviceName: meta.device,
                ip: meta.ip,
            });
        }
        throw new UnauthorizedException(
            result.reason === 'race' ? 'i18n:auth.REFRESH_RACE' : 'i18n:auth.SESSION_EXPIRED',
        );
    }

    async logout(admin: AdminPrincipal, all: boolean, ip?: string) {
        if (all) await this.sessions.revokeAllForAdmin(admin.id);
        else await this.sessions.revokeFamily(admin.familyId);
        this.audit.log({
            action: all ? 'auth.logout_all' : 'auth.logout',
            entity: 'admin_session',
            entityId: admin.sessionId,
            adminId: admin.id,
            deviceName: admin.device,
            ip,
        });
    }

    async me(principal: AdminPrincipal) {
        const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: principal.id } });
        const remainingRecoveryCodes = await this.prisma.adminRecoveryCode.count({
            where: { adminId: admin.id, usedAt: null },
        });
        return {
            id: admin.id,
            email: admin.email,
            device: principal.device,
            sessionId: principal.sessionId,
            totpEnabledAt: admin.totpEnabledAt,
            lastLoginAt: admin.lastLoginAt,
            googleLinked: !!admin.googleSub,
            remainingRecoveryCodes,
        };
    }

    // ── Google ──────────────────────────────────────────────────────────────

    /** Returns the pending token for the next step, or an error code for the login page. */
    async googleLogin(
        state: { expected?: string; received?: string; verifier?: string },
        code: string | undefined,
        meta: ReqMeta,
    ): Promise<{ ok: true; step: LoginStep; pending: string } | { ok: false; error: string }> {
        const deny = (error: string, detail?: string) => {
            this.audit.log({
                action: 'auth.google_denied',
                entity: 'admin_user',
                deviceName: meta.device,
                ip: meta.ip,
                diff: { error, detail },
            });
            return { ok: false as const, error };
        };
        if (!this.google.enabled) return deny('google_disabled');
        if (!state.expected || !state.received || !state.verifier || !code) return deny('google_state');
        const a = Buffer.from(state.expected);
        const b = Buffer.from(state.received);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return deny('google_state');

        let identity;
        try {
            identity = await this.google.exchange(code, state.verifier);
        } catch (err) {
            return deny('google_exchange', (err as Error).message);
        }
        if (!identity.emailVerified) return deny('google_denied', 'email_not_verified');
        if (!ADMIN_AUTH.google.allowlist.includes(identity.email)) return deny('google_denied', 'not_allowlisted');

        const admin = await this.prisma.adminUser.findUnique({ where: { email: identity.email } });
        if (!admin || admin.disabledAt) return deny('google_denied', 'no_active_admin');
        if (admin.googleSub && admin.googleSub !== identity.sub) return deny('google_denied', 'sub_mismatch');
        if (!admin.googleSub)
            await this.prisma.adminUser.update({ where: { id: admin.id }, data: { googleSub: identity.sub } });

        const { step, pending } = this.startSecondFactor(admin, 'google', meta);
        return { ok: true, step, pending };
    }
}
