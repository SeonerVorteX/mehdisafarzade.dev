import { Injectable } from '@nestjs/common';
import { ADMIN_PASSWORD_LOCKOUT } from 'src/common/constants/admin';
import { ADMIN_OTP_LOCKOUT } from 'src/common/constants/rateLimits';
import { RedisService } from 'src/common/helpers/redis/redis.service';

type Policy = { MAX_FAILURES: number; FAILURE_WINDOW_MS: number; LOCK_DURATION_MS: number };

/**
 * Per-account lockouts, modelled on Examination's `adminOtpLockout.service.ts`:
 * keyed on the targeted account (not the IP, since a brute force can come from
 * many IPs, but there is only one account), and once locked, even a correct
 * code/password is refused until the lock expires.
 *  - TOTP: per admin id (5 failures / 15 min → 15-min lock, Examination's numbers)
 *  - password: per submitted email, whether or not it exists (no account enumeration)
 * Fails open on Redis errors like Examination: nginx limit_req and the IP
 * throttler stay as backstops.
 */
@Injectable()
export class AdminLockoutService {
    constructor(private readonly redis: RedisService) {}

    isTotpLocked(adminId: string) {
        return this.isLocked(`admin:otp:${adminId}`);
    }
    recordTotpFailure(adminId: string) {
        return this.recordFailure(`admin:otp:${adminId}`, ADMIN_OTP_LOCKOUT);
    }
    clearTotp(adminId: string) {
        return this.clear(`admin:otp:${adminId}`);
    }

    isPasswordLocked(email: string) {
        return this.isLocked(`admin:pw:${email}`);
    }
    recordPasswordFailure(email: string) {
        return this.recordFailure(`admin:pw:${email}`, ADMIN_PASSWORD_LOCKOUT);
    }
    clearPassword(email: string) {
        return this.clear(`admin:pw:${email}`);
    }

    private async isLocked(base: string): Promise<boolean> {
        try {
            return (await this.redis.client.exists(`${base}:lock`)) === 1;
        } catch {
            return false;
        }
    }

    private async recordFailure(base: string, policy: Policy): Promise<void> {
        try {
            const count = await this.redis.client.incr(`${base}:fail`);
            if (count === 1) await this.redis.client.pexpire(`${base}:fail`, policy.FAILURE_WINDOW_MS);
            if (count >= policy.MAX_FAILURES) {
                await this.redis.client.set(`${base}:lock`, '1', 'PX', policy.LOCK_DURATION_MS);
            }
        } catch {
            /* best effort */
        }
    }

    private async clear(base: string): Promise<void> {
        try {
            await this.redis.client.del(`${base}:fail`, `${base}:lock`);
        } catch {
            /* ignore */
        }
    }
}
