import { Injectable, NotFoundException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PREVIEW_SECRET } from '../constants/env';

const WINDOW_S = 5 * 60;

/** Signature for a preview fetch: HMAC-SHA256(PREVIEW_SECRET, `${path}.${timestamp}`), hex. */
export function signPreview(path: string, timestamp: string, secret = PREVIEW_SECRET): string {
    return createHmac('sha256', secret).update(`${path}.${timestamp}`).digest('hex');
}

/**
 * Server-to-server only (web draft mode → API): `x-preview-timestamp` +
 * `x-preview-signature` over the request path (without query). Anything
 * unsigned, stale or wrong is a plain 404, so the endpoint is invisible to the public.
 */
@Injectable()
export class PreviewGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        const req = ctx.switchToHttp().getRequest<Request>();
        const ts = String(req.headers['x-preview-timestamp'] ?? '');
        const sig = String(req.headers['x-preview-signature'] ?? '');
        const age = Math.abs(Date.now() / 1000 - Number(ts));
        if (!PREVIEW_SECRET || !/^\d+$/.test(ts) || !(age <= WINDOW_S) || !/^[0-9a-f]{64}$/.test(sig)) {
            throw new NotFoundException();
        }
        const expected = Buffer.from(signPreview(req.path, ts), 'hex');
        if (!timingSafeEqual(expected, Buffer.from(sig, 'hex'))) throw new NotFoundException();
        return true;
    }
}
