import type { MediaMime } from './media.constants';

/**
 * Detects the real type of an upload from its first bytes (brief §6: "validate
 * uploads by magic bytes, not just extension"). Covers exactly the accepted
 * formats; anything else is `null`. Hand-rolled on purpose: the maintained
 * `file-type` package is ESM-only, which doesn't fit this CommonJS/Jest setup,
 * and six signatures don't justify a dependency.
 */
export function sniffMime(head: Buffer): MediaMime | null {
    const at = (offset: number, bytes: number[]) => bytes.every((b, i) => head[offset + i] === b);
    const ascii = (offset: number, text: string) =>
        head.subarray(offset, offset + text.length).toString('latin1') === text;

    if (at(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
    if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
    if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'image/webp';
    // ISO-BMFF: [size][ftyp][major brand]; AVIF uses 'avif' (still) or 'avis' (sequence).
    if (ascii(4, 'ftyp') && (ascii(8, 'avif') || ascii(8, 'avis'))) return 'image/avif';
    if (ascii(0, '%PDF-')) return 'application/pdf';
    return null;
}
