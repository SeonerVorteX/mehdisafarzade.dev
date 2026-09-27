import { Injectable, SetMetadata, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tap, type Observable } from 'rxjs';
import type { AdminPrincipal, AdminRequest } from 'src/api/admin/auth/auth.types';
import { AuditService } from '../helpers/audit/audit.service';
import { getClientIp } from '../utils/request.util';

export const AUDIT_ENTITY_KEY = 'auditEntity';
/** Names the entity an admin controller mutates, e.g. `@AuditEntity('post')` → actions like `post.publish`. */
export const AuditEntity = (entity: string) => SetMetadata(AUDIT_ENTITY_KEY, entity);

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Brief §6: "AuditLog records every admin mutation". Applied by @AdminAuth(), so
 * every authenticated admin POST/PUT/PATCH/DELETE that SUCCEEDS writes one row:
 * admin, device, action `<entity>.<handler>`, entity id (route `:id` or the
 * response's `id`), the redacted request body + params, and the client IP.
 * Failed requests aren't audited here (auth failures are audited by the auth service).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly audit: AuditService,
    ) {}

    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = ctx.switchToHttp().getRequest<AdminRequest>();
        if (!MUTATING.has(req.method)) return next.handle();
        const entity =
            this.reflector.getAllAndOverride<string>(AUDIT_ENTITY_KEY, [ctx.getHandler(), ctx.getClass()]) ??
            ctx
                .getClass()
                .name.replace(/Controller$/, '')
                .toLowerCase();
        const action = `${entity}.${ctx.getHandler().name}`;

        return next.handle().pipe(
            tap((result) => {
                const params = (req.params ?? {}) as Record<string, string>;
                const resultId = result && typeof result === 'object' && 'id' in result ? String(result.id) : undefined;
                this.audit.log({
                    action,
                    entity,
                    entityId: params.id ?? resultId ?? null,
                    adminId: (req.user as AdminPrincipal | undefined)?.id ?? null,
                    deviceName: req.adminDevice ?? null,
                    ip: getClientIp(req),
                    diff: { params, body: req.body as unknown },
                });
            }),
        );
    }
}
