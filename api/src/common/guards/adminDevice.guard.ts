import { Injectable, NotFoundException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { AdminRequest } from 'src/api/admin/auth/auth.types';
import { ADMIN_DEVICE_HEADER, ADMIN_DEVICE_PATTERN } from '../constants/admin';

/**
 * Defense in depth behind the nginx device gate (PLAN §8.1). nginx sets
 * `X-Admin-Device` only after a valid gate cookie, overwrites any client value
 * on admin.*, and clears it on api.*. A request without it didn't come through
 * the gate, so it gets the same 404 as a route that doesn't exist.
 */
@Injectable()
export class AdminDeviceGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<AdminRequest>();
        const raw = req.headers[ADMIN_DEVICE_HEADER];
        const device = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
        if (!ADMIN_DEVICE_PATTERN.test(device)) throw new NotFoundException();
        req.adminDevice = device;
        return true;
    }
}
