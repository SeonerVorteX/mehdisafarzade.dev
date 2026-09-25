import { randomBytes } from 'node:crypto';
import { openSecret, sealSecret } from './secretBox.util';

describe('secretBox', () => {
    const key = randomBytes(32).toString('base64');

    it('round-trips and never contains the plaintext', () => {
        const sealed = sealSecret('JBSWY3DPEHPK3PXP', key);
        expect(sealed.startsWith('v1:')).toBe(true);
        expect(sealed).not.toContain('JBSWY3DPEHPK3PXP');
        expect(openSecret(sealed, key)).toBe('JBSWY3DPEHPK3PXP');
    });

    it('uses a fresh IV each time', () => {
        expect(sealSecret('x', key)).not.toBe(sealSecret('x', key));
    });

    it('rejects tampering and the wrong key', () => {
        const sealed = sealSecret('secret', key);
        const parts = sealed.split(':');
        parts[3] = Buffer.from('tampered').toString('base64url');
        expect(() => openSecret(parts.join(':'), key)).toThrow();
        expect(() => openSecret(sealed, randomBytes(32).toString('base64'))).toThrow();
    });

    it('rejects keys that are not 32 bytes', () => {
        expect(() => sealSecret('x', randomBytes(16).toString('base64'))).toThrow(/32 bytes/);
    });
});
