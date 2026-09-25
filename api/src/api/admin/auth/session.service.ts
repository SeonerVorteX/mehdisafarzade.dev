import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AdminSession } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ADMIN_JWT, ADMIN_TTL } from 'src/common/constants/admin';
import { ADMIN_AUTH } from 'src/common/constants/env';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RedisService } from 'src/common/helpers/redis/redis.service';
import type { AccessTokenPayload, AdminPrincipal } from './auth.types';

export type IssuedSession = {
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
    session: AdminSession;
};

export type RotateFailure = 'invalid' | 'expired' | 'race' | 'reuse' | 'device';
export type RotateResult = { ok: true; issued: IssuedSession } | { ok: false; reason: RotateFailure; adminId?: string };

type CachedSession = { adminId: string; email: string; familyId: string; device: string };

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const cacheKey = (sid: string) => `admin:sess:${sid}`;

/**
 * Admin sessions = one row per refresh token (PLAN §8.3).
 * - Access: 10-min JWT `{ sub, sid, dev }`. The guard re-checks `sid` (Redis-cached
 *   for ADMIN_TTL.SESSION_CACHE_S), so revocation lands within a minute at worst.
 * - Refresh: opaque 256-bit token, stored as sha256, rotated on every use.
 *   Presenting an already-rotated token is treated as theft and revokes the whole
 *   family, except within a 15 s grace window (two tabs refreshing at once).
 * - Device binding: a session belongs to the gate device it was created on.
 */
@Injectable()
export class SessionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly jwt: JwtService,
    ) {}

    async create(
        admin: { id: string },
        device: string,
        meta: { ip?: string; userAgent?: string },
        familyId: string = randomUUID(),
    ): Promise<IssuedSession> {
        const refreshToken = randomBytes(32).toString('base64url');
        const session = await this.prisma.adminSession.create({
            data: {
                adminId: admin.id,
                familyId,
                refreshHash: sha256(refreshToken),
                deviceName: device,
                ip: meta.ip,
                userAgent: meta.userAgent,
                expiresAt: new Date(Date.now() + ADMIN_TTL.REFRESH_S * 1000),
            },
        });
        return {
            accessToken: this.signAccess({ sub: admin.id, sid: session.id, dev: device }),
            refreshToken,
            csrfToken: randomBytes(24).toString('base64url'),
            session,
        };
    }

    private signAccess(payload: AccessTokenPayload): string {
        return this.jwt.sign(payload, {
            secret: ADMIN_AUTH.jwtSecret,
            expiresIn: ADMIN_TTL.ACCESS_S,
            issuer: ADMIN_JWT.ISSUER,
            audience: ADMIN_JWT.AUDIENCE,
            algorithm: 'HS256',
        });
    }

    async rotate(
        refreshToken: string,
        device: string,
        meta: { ip?: string; userAgent?: string },
    ): Promise<RotateResult> {
        const row = await this.prisma.adminSession.findUnique({
            where: { refreshHash: sha256(refreshToken) },
            include: { admin: true },
        });
        if (!row) return { ok: false, reason: 'invalid' };

        const now = Date.now();
        if (row.revokedAt || row.replacedById) {
            const benignRace =
                !!row.replacedById &&
                !!row.revokedAt &&
                now - row.revokedAt.getTime() < ADMIN_TTL.REFRESH_RACE_GRACE_MS;
            if (benignRace) return { ok: false, reason: 'race', adminId: row.adminId };
            await this.revokeFamily(row.familyId);
            return { ok: false, reason: 'reuse', adminId: row.adminId };
        }
        if (row.expiresAt.getTime() <= now) return { ok: false, reason: 'expired', adminId: row.adminId };
        if (row.deviceName !== device) {
            await this.revokeFamily(row.familyId);
            return { ok: false, reason: 'device', adminId: row.adminId };
        }
        if (row.admin.disabledAt) {
            await this.revokeFamily(row.familyId);
            return { ok: false, reason: 'invalid', adminId: row.adminId };
        }

        // Claim the old row atomically: of two concurrent rotations, exactly one wins.
        const claimed = await this.prisma.adminSession.updateMany({
            where: { id: row.id, revokedAt: null, replacedById: null },
            data: { revokedAt: new Date(now) },
        });
        if (claimed.count === 0) return { ok: false, reason: 'race', adminId: row.adminId };

        const issued = await this.create(row.admin, device, meta, row.familyId);
        await this.prisma.adminSession.update({ where: { id: row.id }, data: { replacedById: issued.session.id } });
        await this.redis.client.del(cacheKey(row.id)).catch(() => undefined);
        return { ok: true, issued };
    }

    /** Validates an access token's session. Returns null when revoked/expired/disabled/mismatched. */
    async resolveAccess(payload: AccessTokenPayload): Promise<AdminPrincipal | null> {
        const cached = await this.redis.client.get(cacheKey(payload.sid)).catch(() => null);
        let s: CachedSession | null = cached ? (JSON.parse(cached) as CachedSession) : null;

        if (!s) {
            const row = await this.prisma.adminSession.findUnique({
                where: { id: payload.sid },
                include: { admin: { select: { email: true, disabledAt: true } } },
            });
            if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now() || row.admin.disabledAt) return null;
            s = { adminId: row.adminId, email: row.admin.email, familyId: row.familyId, device: row.deviceName };
            await this.redis.client
                .set(cacheKey(payload.sid), JSON.stringify(s), 'EX', ADMIN_TTL.SESSION_CACHE_S)
                .catch(() => undefined);
        }
        if (s.adminId !== payload.sub || s.device !== payload.dev) return null;
        return { id: s.adminId, email: s.email, sessionId: payload.sid, familyId: s.familyId, device: s.device };
    }

    async revoke(sessionId: string): Promise<void> {
        await this.prisma.adminSession.updateMany({
            where: { id: sessionId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        await this.redis.client.del(cacheKey(sessionId)).catch(() => undefined);
    }

    async revokeFamily(familyId: string): Promise<void> {
        await this.revokeWhere({ familyId });
    }

    async revokeAllForAdmin(adminId: string): Promise<void> {
        await this.revokeWhere({ adminId });
    }

    private async revokeWhere(where: { familyId?: string; adminId?: string }) {
        const rows = await this.prisma.adminSession.findMany({ where, select: { id: true } });
        await this.prisma.adminSession.updateMany({
            where: { ...where, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        if (rows.length) await this.redis.client.del(...rows.map((r) => cacheKey(r.id))).catch(() => undefined);
    }

    /** Active sessions: the head of each family (not rotated away, not expired). */
    listActive(adminId: string) {
        return this.prisma.adminSession.findMany({
            where: { adminId, revokedAt: null, replacedById: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                familyId: true,
                deviceName: true,
                ip: true,
                userAgent: true,
                createdAt: true,
                lastUsedAt: true,
            },
        });
    }
}
