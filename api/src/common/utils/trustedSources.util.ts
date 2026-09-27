import { isIP } from 'node:net';

/**
 * Who may send the proxy-set headers X-Admin-Device and X-Real-IP (PLAN §9.2).
 *
 * In production the API publishes no host port. It's reachable only on its Docker
 * networks, so the TCP peer is one of:
 *   - the `portfolio` bridge gateway (host nginx, which proxies to container IPs), TRUSTED
 *   - the admin containers' fixed blue/green IPs (admin SSR → API), TRUSTED
 *   - the web containers, anything else on `portfolio`, and everything on `backend`
 *     (Examination's containers), NOT trusted: their X-Admin-Device gets a 404
 *     and their X-Real-IP is ignored
 * The list holds exact IPs only (no CIDR), so a new container on the subnet is
 * never trusted by accident.
 */

/** "::ffff:10.231.0.1" → "10.231.0.1"; lowercases IPv6; strips a zone id ("fe80::1%eth0"). */
export function normalizeIp(raw: string | undefined | null): string {
    if (!raw) return '';
    let ip = raw.trim().toLowerCase();
    const zone = ip.indexOf('%');
    if (zone !== -1) ip = ip.slice(0, zone);
    if (ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4) ip = ip.slice(7);
    return ip;
}

export type TrustedSourcesParse = { ips: Set<string>; errors: string[] };

export function parseTrustedSources(raw: string | undefined): TrustedSourcesParse {
    const ips = new Set<string>();
    const errors: string[] = [];
    for (const part of (raw ?? '').split(',')) {
        const entry = part.trim();
        if (!entry) continue;
        if (entry.includes('/')) {
            errors.push(`"${entry}" is a CIDR range; list exact IPs only`);
            continue;
        }
        const ip = normalizeIp(entry);
        if (isIP(ip) === 0) {
            errors.push(`"${entry}" is not an IP address`);
            continue;
        }
        ips.add(ip);
    }
    return { ips, errors };
}

export function isTrustedSource(remoteAddress: string | undefined | null, trusted: ReadonlySet<string>): boolean {
    const ip = normalizeIp(remoteAddress);
    return ip !== '' && trusted.has(ip);
}
