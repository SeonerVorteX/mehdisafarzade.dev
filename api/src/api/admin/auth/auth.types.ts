import type { Request } from 'express';

/** What AdminJwtStrategy puts on `req.user` for authenticated admin requests. */
export type AdminPrincipal = {
    id: string;
    email: string;
    sessionId: string;
    familyId: string;
    device: string;
};

export type AdminRequest = Request & { user?: AdminPrincipal; adminDevice?: string };

export type AccessTokenPayload = { sub: string; sid: string; dev: string };

export type PendingPurpose = 'setup' | 'verify';
export type PendingTokenPayload = { sub: string; purpose: PendingPurpose; dev: string; via: 'password' | 'google' };
