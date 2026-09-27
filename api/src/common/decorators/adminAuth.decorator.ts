import {
    applyDecorators,
    createParamDecorator,
    SetMetadata,
    UseGuards,
    UseInterceptors,
    type ExecutionContext,
} from '@nestjs/common';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import type { AdminPrincipal, AdminRequest } from 'src/api/admin/auth/auth.types';
import { AdminCsrfGuard, AdminOriginGuard } from '../guards/adminCsrf.guard';
import { AdminDeviceGuard } from '../guards/adminDevice.guard';
import { AdminJwtGuard } from '../guards/adminJwt.guard';

/**
 * Every controller/handler under `/v1/admin` must carry exactly one of these.
 * Guards stay opt-in per controller (Examination convention), and
 * `test/admin-guards.e2e-spec.ts` enumerates the router and fails CI if any
 * admin route has no realm marker or answers without the required checks.
 */
export const ADMIN_REALM_KEY = 'adminRealm';
export type AdminRealm = 'auth' | 'public';

/** Authenticated admin API: gate device + access JWT (session + device bound) + CSRF on mutations + audit. */
export const AdminAuth = () =>
    applyDecorators(
        SetMetadata(ADMIN_REALM_KEY, 'auth' satisfies AdminRealm),
        UseGuards(AdminDeviceGuard, AdminJwtGuard, AdminCsrfGuard),
        // Every successful authenticated mutation is written to the audit log (brief §6).
        UseInterceptors(AuditInterceptor),
    );

/** Pre-session admin routes (login, TOTP, refresh, pending): gate device + same-origin check on mutations. */
export const AdminPublic = () =>
    applyDecorators(
        SetMetadata(ADMIN_REALM_KEY, 'public' satisfies AdminRealm),
        UseGuards(AdminDeviceGuard, AdminOriginGuard),
    );

export const CurrentAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext): AdminPrincipal => {
    // passport's global `Express.User` augmentation makes `req.user` loosely typed; narrow it explicitly.
    const user = ctx.switchToHttp().getRequest<AdminRequest>().user as AdminPrincipal | undefined;
    if (!user) throw new Error('@CurrentAdmin used on a route without @AdminAuth()');
    return user;
});

export const AdminDevice = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
    const device = ctx.switchToHttp().getRequest<AdminRequest>().adminDevice;
    if (!device) throw new Error('@AdminDevice used on a route without an admin realm decorator');
    return device;
});
