import { Injectable, NotFoundException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { AdminRequest } from 'src/api/admin/auth/auth.types';
import { ADMIN_DEVICE_HEADER, ADMIN_DEVICE_PATTERN } from '../constants/admin';
import { isFromTrustedProxy } from '../utils/request.util';

/**
 * Defense in depth behind the nginx device gate (PLAN §8.1, §9.2). A request counts
 * as "came through the gate" only when BOTH hold:
 *  1. the TCP peer is a trusted proxy (exact IPs in ADMIN_TRUSTED_SOURCES: the
 *     portfolio bridge gateway = host nginx, and the admin containers), and
 *  2. it carries a well-formed X-Admin-Device, which nginx sets from the gate map
 *     (overwriting any client value on admin.*, clearing it on api.*).
 * Anything else, including a forged header from the web container or from
 * Examination's containers on the shared `backend` network, gets the same 404 as
 * a route that doesn't exist.
 */
@Injectable()
export class AdminDeviceGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<AdminRequest>();
        if (!isFromTrustedProxy(req)) throw new NotFoundException();
        const raw = req.headers[ADMIN_DEVICE_HEADER];
        const device = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
        if (!ADMIN_DEVICE_PATTERN.test(device)) throw new NotFoundException();
        req.adminDevice = device;
        return true;
    }
}
