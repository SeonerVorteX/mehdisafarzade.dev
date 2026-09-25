import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM for small secrets at rest (TOTP seeds). Format:
 * `v1:<iv>:<tag>:<ciphertext>`, each part base64url. The version prefix leaves
 * room for key rotation later. Examination stores TOTP secrets in plaintext;
 * the brief requires encryption at rest.
 */
const VERSION = 'v1';

function key(b64: string): Buffer {
    const k = Buffer.from(b64, 'base64');
    if (k.length !== 32) throw new Error('TOTP_ENC_KEY must decode to exactly 32 bytes');
    return k;
}

export function sealSecret(plaintext: string, keyB64: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key(keyB64), iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join(':');
}

export function openSecret(sealed: string, keyB64: string): string {
    const [version, iv, tag, ct] = sealed.split(':');
    if (version !== VERSION || !iv || !tag || !ct) throw new Error('Unsupported sealed secret format');
    const decipher = createDecipheriv('aes-256-gcm', key(keyB64), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
}
