import { sniffMime } from './magic.util';

const bytes = (...parts: (number[] | string)[]) =>
    Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))));

describe('sniffMime', () => {
    it.each([
        [bytes([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg'],
        [bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
        [bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '), 'image/webp'],
        [bytes([0, 0, 0, 0x1c], 'ftypavif'), 'image/avif'],
        [bytes('%PDF-1.7\n'), 'application/pdf'],
    ])('detects %#', (head, mime) => {
        expect(sniffMime(head)).toBe(mime);
    });

    it.each([
        ['svg', bytes('<svg xmlns="http://www.w3.org/2000/svg">')],
        ['html', bytes('<!doctype html><script>')],
        ['gif', bytes('GIF89a')],
        ['heic', bytes([0, 0, 0, 0x18], 'ftypheic')],
        ['empty', Buffer.alloc(0)],
    ])('rejects %s', (_n, head) => {
        expect(sniffMime(head)).toBeNull();
    });
});
