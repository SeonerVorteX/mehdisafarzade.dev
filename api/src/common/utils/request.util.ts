import type { Request } from 'express';
import { IS_PRODUCTION } from '../constants/env';

/**
 * Client IP.
 *
 * Production: the API is reachable only from nginx (loopback-published port) and
 * from the admin app over the private Docker network. nginx sets `X-Real-IP` from
 * `$remote_addr`, which `real_ip_header CF-Connecting-IP` has already resolved to
 * the visitor. `X-Forwarded-For[0]` is NOT used: its first entry is whatever the
 * client sent, so it's spoofable. (Examination reads it; this is a deliberate
 * deviation.)
 *
 * Dev/test: the socket address.
 */
export function getClientIp(req: Pick<Request, 'headers' | 'socket'>): string {
    if (IS_PRODUCTION) {
        const real = req.headers['x-real-ip'];
        const value = Array.isArray(real) ? real[0] : real;
        if (value) return value.trim();
    }
    return req.socket?.remoteAddress ?? 'unknown';
}

export function getUserAgent(req: Pick<Request, 'headers'>): string | undefined {
    const ua = req.headers['user-agent'];
    return typeof ua === 'string' ? ua.slice(0, 512) : undefined;
}
