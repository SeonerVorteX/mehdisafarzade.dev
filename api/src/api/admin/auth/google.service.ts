import { Injectable } from '@nestjs/common';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { ADMIN_AUTH, ADMIN_ORIGIN } from 'src/common/constants/env';

export type GoogleIdentity = { sub: string; email: string; emailVerified: boolean };

/**
 * Google sign-in for admins, done directly with google-auth-library
 * (authorization code + PKCE + ID-token verification) rather than
 * passport-google-oauth20 as in Examination: PKCE and the SameSite handling
 * are explicit this way. The callback runs on the admin host, so it sits behind
 * the device gate too: `<ADMIN_ORIGIN>/api/auth/google/callback`.
 */
@Injectable()
export class GoogleAuthService {
    get enabled(): boolean {
        return ADMIN_AUTH.google.enabled;
    }

    get redirectUri(): string {
        return `${ADMIN_ORIGIN}/api/auth/google/callback`;
    }

    private client(): OAuth2Client {
        return new OAuth2Client({
            clientId: ADMIN_AUTH.google.clientId,
            clientSecret: ADMIN_AUTH.google.clientSecret,
            redirectUri: this.redirectUri,
        });
    }

    async createPkce(): Promise<{ verifier: string; challenge: string }> {
        const { codeVerifier, codeChallenge } = await this.client().generateCodeVerifierAsync();
        if (!codeChallenge) throw new Error('PKCE challenge generation failed');
        return { verifier: codeVerifier, challenge: codeChallenge };
    }

    authUrl(state: string, codeChallenge: string): string {
        return this.client().generateAuthUrl({
            access_type: 'online',
            scope: ['openid', 'email'],
            state,
            code_challenge: codeChallenge,
            code_challenge_method: CodeChallengeMethod.S256,
            prompt: 'select_account',
        });
    }

    async exchange(code: string, codeVerifier: string): Promise<GoogleIdentity> {
        const client = this.client();
        const { tokens } = await client.getToken({ code, codeVerifier });
        if (!tokens.id_token) throw new Error('Google returned no ID token');
        const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: ADMIN_AUTH.google.clientId });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email) throw new Error('Google ID token has no subject/email');
        return { sub: payload.sub, email: payload.email.toLowerCase(), emailVerified: payload.email_verified === true };
    }
}
