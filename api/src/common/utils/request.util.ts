import type { Request } from 'express';
import { ADMIN_TRUSTED_SOURCES } from '../constants/env';
import { isTrustedSource, normalizeIp } from './trustedSources.util';

/** True when the TCP peer is host nginx or an admin container (ADMIN_TRUSTED_SOURCES, exact IPs). */
export function isFromTrustedProxy(req: Pick<Request, 'socket'>): boolean {
    return isTrustedSource(req.socket?.remoteAddress, ADMIN_TRUSTED_SOURCES);
}

/**
 * Client IP.
 *
 * `X-Real-IP` is honored ONLY when the TCP peer is a trusted proxy (host nginx via
 * the portfolio bridge gateway, or an admin container forwarding what nginx gave
 * it). nginx sets it from `$remote_addr`, which `real_ip_header CF-Connecting-IP`
 * has already resolved to the visitor. From any other peer (the web container,
 * Examination's containers on `backend`) the header is ignored and the socket
 * address is used. `X-Forwarded-For[0]` is never used because the client controls it.
 */
export function getClientIp(req: Pick<Request, 'headers' | 'socket'>): string {
    if (isFromTrustedProxy(req)) {
        const real = req.headers['x-real-ip'];
        const value = Array.isArray(real) ? real[0] : real;
        if (value) return value.trim();
    }
    return normalizeIp(req.socket?.remoteAddress) || 'unknown';
}

export function getUserAgent(req: Pick<Request, 'headers'>): string | undefined {
    const ua = req.headers['user-agent'];
    return typeof ua === 'string' ? ua.slice(0, 512) : undefined;
}
