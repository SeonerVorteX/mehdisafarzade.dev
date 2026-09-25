import { Injectable, type ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { STRICT_IP_THROTTLE_KEY } from '../decorators/strictIpThrottle.decorator';
import { getClientIp } from '../utils/request.util';

/** Admin session cookie names (defined here to avoid a guard → auth-module import cycle). */
const SESSION_COOKIES = ['__Host-pf_at', '__Host-pf_rt'];

/**
 * Global throttler (APP_GUARD), modelled on Examination's AppThrottlerGuard:
 * - The tracker is the real client IP (`getClientIp`: nginx's X-Real-IP in
 *   production, not the spoofable X-Forwarded-For[0]).
 * - When an admin session cookie is present, the key becomes IP + a hash of that
 *   (unverified) cookie, so a busy admin doesn't share a bucket with anonymous
 *   traffic from the same IP.
 * - `@StrictIpThrottle()` routes always use the plain IP.
 * RMQ event handlers are not throttled.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
    protected override async getTracker(req: Record<string, unknown>, context?: ExecutionContext): Promise<string> {
        const request = req as unknown as Request;
        const ip = getClientIp(request);
        const strictIp = context
            ? this.reflector.getAllAndOverride<boolean>(STRICT_IP_THROTTLE_KEY, [
                  context.getHandler(),
                  context.getClass(),
              ])
            : false;
        if (strictIp) return ip;

        const cookies = (request.cookies ?? {}) as Record<string, string | undefined>;
        const token = SESSION_COOKIES.map((n) => cookies[n]).find(Boolean);
        if (!token) return ip;
        return `${ip}:${createHash('sha256').update(token).digest('hex').slice(0, 16)}`;
    }

    protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
        return context.getType() !== 'http';
    }
}
