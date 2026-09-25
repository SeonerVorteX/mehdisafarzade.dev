import { Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import { randomInt } from 'node:crypto';
import { authenticator } from 'otplib';
import { RECOVERY_CODE_COUNT, TOTP_ISSUER } from 'src/common/constants/admin';
import { ADMIN_AUTH, IS_PRODUCTION } from 'src/common/constants/env';
import { RedisService } from 'src/common/helpers/redis/redis.service';
import { openSecret, sealSecret } from 'src/common/utils/secretBox.util';

/** ±1 step (30 s) of clock drift, like otplib's common setting. */
const totp = authenticator.clone({ window: 1 });
/** No 0/o/1/l/i to avoid transcription mistakes. */
const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

@Injectable()
export class TotpService {
    constructor(private readonly redis: RedisService) {}

    newSecret(): string {
        return totp.generateSecret(20);
    }

    seal(secret: string): string {
        return sealSecret(secret, ADMIN_AUTH.totpEncKey);
    }

    open(sealed: string): string {
        return openSecret(sealed, ADMIN_AUTH.totpEncKey);
    }

    otpauthUrl(email: string, secret: string): string {
        return totp.keyuri(email, IS_PRODUCTION ? TOTP_ISSUER : `${TOTP_ISSUER} (dev)`, secret);
    }

    /**
     * Verifies a 6-digit code and burns it: the same code can't be replayed
     * within its validity window (Redis SET NX). If Redis is unavailable the
     * replay check is skipped rather than locking the owner out.
     */
    async verify(adminId: string, secret: string, code: string): Promise<boolean> {
        if (!/^\d{6}$/.test(code) || !totp.check(code, secret)) return false;
        try {
            const fresh = await this.redis.client.set(`admin:totp-used:${adminId}:${code}`, '1', 'PX', 95_000, 'NX');
            return fresh === 'OK';
        } catch {
            return true;
        }
    }

    /** 10 single-use codes like `k7m2p-x9qa4` (~50 bits each). Returns plaintext (shown once) + argon2 hashes. */
    async generateRecoveryCodes(): Promise<{ codes: string[]; hashes: string[] }> {
        const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
            const chars = Array.from({ length: 10 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]);
            return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
        });
        const hashes = await Promise.all(
            codes.map((c) => argon.hash(normalizeRecoveryCode(c), { type: argon.argon2id })),
        );
        return { codes, hashes };
    }
}

export function normalizeRecoveryCode(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function looksLikeRecoveryCode(input: string): boolean {
    return normalizeRecoveryCode(input).length === 10;
}
