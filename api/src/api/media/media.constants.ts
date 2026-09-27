/** Accepted uploads (brief §6: validated by magic bytes, size-limited). No SVG (script-capable), no GIF. */
export const MEDIA_TYPES = {
    'image/jpeg': { ext: 'jpg', maxBytes: 15 * 1024 * 1024, image: true },
    'image/png': { ext: 'png', maxBytes: 15 * 1024 * 1024, image: true },
    'image/webp': { ext: 'webp', maxBytes: 15 * 1024 * 1024, image: true },
    'image/avif': { ext: 'avif', maxBytes: 15 * 1024 * 1024, image: true },
    'application/pdf': { ext: 'pdf', maxBytes: 10 * 1024 * 1024, image: false },
} as const;

export type MediaMime = keyof typeof MEDIA_TYPES;
export const MEDIA_MIMES = Object.keys(MEDIA_TYPES) as MediaMime[];

/** Responsive widths generated for images (never upscaled). */
export const VARIANT_WIDTHS = [480, 960, 1600] as const;
export const VARIANT_FORMATS = ['avif', 'webp'] as const;
export type VariantFormat = (typeof VARIANT_FORMATS)[number];

/** `variants` JSON on Media: { avif: { "480": "<s3 key>", … }, webp: { … } } */
export type MediaVariants = Partial<Record<VariantFormat, Record<string, string>>>;

export const PRESIGN_PUT_TTL_S = 5 * 60;
export const PRESIGN_GET_TTL_S = 10 * 60;
/** How long a public media redirect may be cached (must stay below PRESIGN_GET_TTL_S). */
export const MEDIA_REDIRECT_CACHE_S = 5 * 60;
