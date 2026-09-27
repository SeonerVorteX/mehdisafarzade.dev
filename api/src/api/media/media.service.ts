import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Media, type MediaTranslation } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { type AppLocale } from 'src/common/constants/locales';
import { EVENTS } from 'src/common/constants/rabbitmq';
import { ContentCacheService } from 'src/common/helpers/cache/contentCache.service';
import { BaseLoggerService } from 'src/common/helpers/logger/logger.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RevalidationService } from 'src/common/helpers/revalidation/revalidation.service';
import { RabbitMQService } from 'src/common/helpers/rmq/rmq.service';
import { S3Service } from 'src/common/helpers/s3/s3.service';
import { pickTranslation } from 'src/common/utils/content.util';
import { sniffMime } from './magic.util';
import {
    MEDIA_REDIRECT_CACHE_S,
    MEDIA_TYPES,
    PRESIGN_GET_TTL_S,
    PRESIGN_PUT_TTL_S,
    VARIANT_FORMATS,
    VARIANT_WIDTHS,
    type MediaMime,
    type MediaVariants,
} from './media.constants';

export type MediaWithT = Media & { translations: MediaTranslation[] };

/** Public shape of a media reference (web builds URLs as `${API_URL}/media/${id}/${variant}`). */
export type MediaView = {
    id: string;
    mime: string;
    width: number | null;
    height: number | null;
    lqip: string | null;
    alt: string;
    caption: string | null;
    variants: string[];
};

export type MediaUsage = { type: string; id: string; label: string };
export type MediaUploadedEvent = { mediaId: string };

@Injectable()
export class MediaService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
        private readonly rmq: RabbitMQService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
        private readonly logger: BaseLoggerService,
    ) {
        this.logger.setContext(MediaService.name);
    }

    // ── presentation ────────────────────────────────────────────────────────

    static variantNames(media: Pick<Media, 'mime' | 'variants' | 'status'>): string[] {
        if (media.status !== 'READY') return [];
        if (media.mime === 'application/pdf') return ['original'];
        const v = (media.variants ?? {}) as MediaVariants;
        return VARIANT_FORMATS.flatMap((fmt) => Object.keys(v[fmt] ?? {}).map((w) => `${fmt}-${w}`));
    }

    static present(media: MediaWithT | null | undefined, locale: AppLocale): MediaView | null {
        if (!media || media.status !== 'READY') return null;
        const t = pickTranslation(media.translations, locale)?.t;
        return {
            id: media.id,
            mime: media.mime,
            width: media.width,
            height: media.height,
            lqip: media.lqip,
            alt: t?.alt ?? '',
            caption: t?.caption ?? null,
            variants: MediaService.variantNames(media),
        };
    }

    // ── upload: presign → browser PUT → finalize → (images) async processing ──

    async presign(input: { filename: string; mime: string; size: number }, adminId: string) {
        const type = MEDIA_TYPES[input.mime as MediaMime];
        if (!type) throw new BadRequestException({ i18nKey: 'media.TYPE_NOT_ALLOWED', fields: ['mime'] });
        if (input.size <= 0 || input.size > type.maxBytes) {
            throw new BadRequestException({
                i18nKey: 'media.TOO_LARGE',
                args: { max: Math.round(type.maxBytes / 1024 / 1024) },
                fields: ['size'],
            });
        }
        const id = randomUUID();
        const s3Key = `media/${id}/original.${type.ext}`;
        const uploadUrl = await this.s3.presignPut(s3Key, input.mime, input.size, PRESIGN_PUT_TTL_S);
        const media = await this.prisma.media.create({
            data: { id, s3Key, mime: input.mime, size: input.size, status: 'PENDING', uploadedById: adminId },
        });
        return {
            media: { id: media.id, status: media.status },
            upload: {
                url: uploadUrl,
                method: 'PUT',
                headers: { 'Content-Type': input.mime },
                expiresIn: PRESIGN_PUT_TTL_S,
            },
        };
    }

    async finalize(id: string) {
        const media = await this.prisma.media.findUnique({ where: { id } });
        if (!media) throw new NotFoundException({ i18nKey: 'media.NOT_FOUND' });
        if (media.status !== 'PENDING') return this.adminView(id);

        let size: number | undefined;
        try {
            size = (await this.s3.head(media.s3Key)).ContentLength;
        } catch {
            throw new BadRequestException({ i18nKey: 'media.NOT_UPLOADED' });
        }
        const head = await this.s3.readHead(media.s3Key, 64);
        const actual = sniffMime(head);
        if (size !== media.size || actual !== media.mime) {
            await this.s3.delete(media.s3Key).catch(() => undefined);
            await this.prisma.media.update({ where: { id }, data: { status: 'FAILED' } });
            throw new BadRequestException({ i18nKey: 'media.TYPE_MISMATCH', args: { detected: actual ?? 'unknown' } });
        }

        if (MEDIA_TYPES[media.mime].image) {
            await this.rmq.publish<MediaUploadedEvent>(EVENTS.MEDIA_UPLOADED, { mediaId: id });
        } else {
            await this.prisma.media.update({ where: { id }, data: { status: 'READY' } });
        }
        return this.adminView(id);
    }

    /** RMQ consumer: generate AVIF/WebP variants + a tiny WebP LQIP. Idempotent. */
    async process(id: string): Promise<void> {
        const media = await this.prisma.media.findUnique({ where: { id } });
        if (!media || media.status !== 'PENDING') return;
        try {
            const input = await this.s3.getObject(media.s3Key);
            // .rotate() applies EXIF orientation; outputs never carry EXIF (no GPS leaks).
            const meta = await sharp(input, { failOn: 'error' }).rotate().metadata();
            const width = meta.autoOrient?.width ?? meta.width ?? 0;
            const height = meta.autoOrient?.height ?? meta.height ?? 0;
            if (!width || !height) throw new Error('image has no dimensions');

            const widths = VARIANT_WIDTHS.filter((w) => w <= width);
            const targets = widths.length ? [...widths] : [width];
            const variants: MediaVariants = {};
            for (const fmt of VARIANT_FORMATS) {
                variants[fmt] = {};
                for (const w of targets) {
                    const buf = await sharp(input)
                        .rotate()
                        .resize({ width: w, withoutEnlargement: true })
                        .toFormat(fmt, fmt === 'avif' ? { quality: 50 } : { quality: 78 })
                        .toBuffer();
                    const key = `media/${id}/${fmt}-${w}.${fmt}`;
                    await this.s3.putObject(key, buf, `image/${fmt}`);
                    variants[fmt][String(w)] = key;
                }
            }
            const lqipBuf = await sharp(input).rotate().resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
            await this.prisma.media.update({
                where: { id },
                data: {
                    status: 'READY',
                    width,
                    height,
                    lqip: `data:image/webp;base64,${lqipBuf.toString('base64')}`,
                    variants: variants,
                },
            });
            await this.revalidation.contentChanged([`media:${id}`]);
        } catch (err) {
            this.logger.error(`media ${id} processing failed: ${(err as Error).message}`);
            await this.prisma.media.update({ where: { id }, data: { status: 'FAILED' } });
        }
    }

    // ── admin ───────────────────────────────────────────────────────────────

    async adminView(id: string) {
        const media = await this.prisma.media.findUnique({ where: { id }, include: { translations: true } });
        if (!media) throw new NotFoundException({ i18nKey: 'media.NOT_FOUND' });
        return {
            id: media.id,
            mime: media.mime,
            size: media.size,
            status: media.status,
            width: media.width,
            height: media.height,
            lqip: media.lqip,
            variants: MediaService.variantNames(media),
            translations: media.translations.map(({ locale, alt, caption }) => ({ locale, alt, caption })),
            createdAt: media.createdAt,
        };
    }

    async list(page: number, pageSize: number, status?: Media['status']) {
        const where = status ? { status } : {};
        const [rows, total] = await Promise.all([
            this.prisma.media.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: { translations: true },
            }),
            this.prisma.media.count({ where }),
        ]);
        return {
            items: rows.map((m) => ({
                id: m.id,
                mime: m.mime,
                size: m.size,
                status: m.status,
                width: m.width,
                height: m.height,
                lqip: m.lqip,
                variants: MediaService.variantNames(m),
                alt: m.translations.find((t) => t.locale === 'en')?.alt ?? '',
                createdAt: m.createdAt,
            })),
            total,
        };
    }

    async upsertTranslation(id: string, locale: AppLocale, data: { alt: string; caption?: string | null }) {
        await this.ensureExists(id);
        await this.prisma.mediaTranslation.upsert({
            where: { mediaId_locale: { mediaId: id, locale } },
            create: { mediaId: id, locale, alt: data.alt, caption: data.caption ?? null },
            update: { alt: data.alt, caption: data.caption ?? null },
        });
        await this.revalidation.contentChanged([`media:${id}`]);
        return this.adminView(id);
    }

    /** Where is this media used? Covers, gallery, résumés, and Markdown bodies that reference `media:<id>`. */
    async usage(id: string): Promise<MediaUsage[]> {
        await this.ensureExists(id);
        const ref = `media:${id}`;
        const [postCovers, projectCovers, gallery, resumes, postBodies, projectBodies, pageBodies, expBodies] =
            await Promise.all([
                this.prisma.post.findMany({ where: { coverMediaId: id }, include: { translations: true } }),
                this.prisma.project.findMany({ where: { coverMediaId: id } }),
                this.prisma.projectMedia.findMany({ where: { mediaId: id }, include: { project: true } }),
                this.prisma.profileResume.findMany({ where: { mediaId: id } }),
                this.prisma.postTranslation.findMany({ where: { bodyMarkdown: { contains: ref } } }),
                this.prisma.projectTranslation.findMany({ where: { caseStudyMarkdown: { contains: ref } } }),
                this.prisma.pageTranslation.findMany({ where: { bodyMarkdown: { contains: ref } } }),
                this.prisma.experienceTranslation.findMany({ where: { bulletsMarkdown: { contains: ref } } }),
            ]);
        return [
            ...postCovers.map((p) => ({ type: 'post.cover', id: p.id, label: p.translations[0]?.title ?? p.id })),
            ...projectCovers.map((p) => ({ type: 'project.cover', id: p.id, label: p.slug })),
            ...gallery.map((g) => ({ type: 'project.gallery', id: g.projectId, label: g.project.slug })),
            ...resumes.map((r) => ({ type: 'profile.resume', id: r.profileId, label: `résumé (${r.locale})` })),
            ...postBodies.map((t) => ({ type: 'post.body', id: t.postId, label: `${t.title} (${t.locale})` })),
            ...projectBodies.map((t) => ({ type: 'project.body', id: t.projectId, label: `${t.title} (${t.locale})` })),
            ...pageBodies.map((t) => ({ type: 'page.body', id: t.pageId, label: `${t.title} (${t.locale})` })),
            ...expBodies.map((t) => ({
                type: 'experience.body',
                id: t.experienceId,
                label: `${t.title} (${t.locale})`,
            })),
        ];
    }

    /** Delete protection (brief §7): refuses while anything references the media. */
    async remove(id: string) {
        const used = await this.usage(id);
        if (used.length) throw new ConflictException({ i18nKey: 'media.IN_USE', args: { count: used.length } });
        const media = await this.prisma.media.findUniqueOrThrow({ where: { id } });
        const v = (media.variants ?? {}) as MediaVariants;
        const keys = [media.s3Key, ...VARIANT_FORMATS.flatMap((f) => Object.values(v[f] ?? {}))];
        await Promise.all(keys.map((k) => this.s3.delete(k).catch(() => undefined)));
        await this.prisma.media.delete({ where: { id } });
        await this.revalidation.contentChanged([`media:${id}`]);
        return { id, deleted: true };
    }

    // ── public ──────────────────────────────────────────────────────────────

    /** Resolves a variant to a short-lived presigned GET (the bucket is private). Cached briefly. */
    async resolveVariant(id: string, variant: string): Promise<string> {
        return this.cache.wrap(
            `media-url:${id}:${variant}`,
            [`media:${id}`],
            async () => {
                const media = await this.prisma.media.findUnique({ where: { id } });
                if (!media || media.status !== 'READY') throw new NotFoundException({ i18nKey: 'media.NOT_FOUND' });
                let key: string | undefined;
                if (variant === 'original') {
                    // Originals of images keep their EXIF (e.g. GPS), so only PDFs are served as-is.
                    if (media.mime === 'application/pdf') key = media.s3Key;
                } else {
                    const [fmt, w] = variant.split('-');
                    key = ((media.variants ?? {}) as MediaVariants)[fmt as keyof MediaVariants]?.[w ?? ''];
                }
                if (!key) throw new NotFoundException({ i18nKey: 'media.NOT_FOUND' });
                return this.s3.presignGet(key, PRESIGN_GET_TTL_S);
            },
            MEDIA_REDIRECT_CACHE_S,
        );
    }

    private async ensureExists(id: string) {
        const found = await this.prisma.media.count({ where: { id } });
        if (!found) throw new NotFoundException({ i18nKey: 'media.NOT_FOUND' });
    }
}
