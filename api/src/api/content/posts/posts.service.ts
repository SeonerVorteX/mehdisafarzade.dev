import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type PostStatus } from '@prisma/client';
import { type AppLocale } from 'src/common/constants/locales';
import { toPage } from 'src/common/dto/query.dto';
import { ContentCacheService } from 'src/common/helpers/cache/contentCache.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RevalidationService } from 'src/common/helpers/revalidation/revalidation.service';
import {
    availableLocales,
    completeness,
    FALLBACK_LOCALE,
    pickTranslation,
    readingTimeMin,
    slugify,
} from 'src/common/utils/content.util';
import { MediaService } from '../../media/media.service';
import type { PostBaseDto, PostTranslationDto } from '../common/content.dto';

/** A post may be published/scheduled only when its `en` translation (the fallback) has these. */
export const POST_REQUIRED: ('title' | 'slug' | 'excerpt' | 'bodyMarkdown')[] = [
    'title',
    'slug',
    'excerpt',
    'bodyMarkdown',
];

const postInclude = {
    translations: true,
    cover: { include: { translations: true } },
    tags: { include: { tag: { include: { translations: true } } } },
} satisfies Prisma.PostInclude;
type PostFull = Prisma.PostGetPayload<{ include: typeof postInclude }>;

const livePost = (now = new Date()): Prisma.PostWhereInput => ({ status: 'PUBLISHED', publishedAt: { lte: now } });

@Injectable()
export class PostsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
    ) {}

    // ── presentation ────────────────────────────────────────────────────────

    private tagView(tag: PostFull['tags'][number]['tag'], locale: AppLocale) {
        const p = pickTranslation(tag.translations, locale);
        return p ? { id: tag.id, name: p.t.name, slug: p.t.slug } : null;
    }

    private summary(post: PostFull, locale: AppLocale) {
        const p = pickTranslation(post.translations, locale);
        if (!p) return null;
        return {
            id: post.id,
            locale: p.locale,
            fallback: p.fallback,
            slug: p.t.slug,
            title: p.t.title,
            excerpt: p.t.excerpt,
            readingTimeMin: p.t.readingTimeMin,
            publishedAt: post.publishedAt,
            featured: post.featured,
            cover: MediaService.present(post.cover, locale),
            tags: post.tags.map((pt) => this.tagView(pt.tag, locale)).filter((t) => t !== null),
        };
    }

    // ── public ──────────────────────────────────────────────────────────────

    list(q: { locale: AppLocale; page: number; pageSize: number; tag?: string; q?: string }) {
        const key = `posts:${q.locale}:${q.page}:${q.pageSize}:${q.tag ?? ''}:${q.q ?? ''}`;
        return this.cache.wrap(key, ['posts', 'tags'], async () => {
            const where: Prisma.PostWhereInput = { ...livePost() };
            if (q.tag) {
                where.tags = {
                    some: {
                        tag: { translations: { some: { slug: q.tag, locale: { in: [q.locale, FALLBACK_LOCALE] } } } },
                    },
                };
            }
            if (q.q) {
                where.translations = {
                    some: {
                        locale: { in: [q.locale, FALLBACK_LOCALE] },
                        OR: [
                            { title: { contains: q.q, mode: 'insensitive' } },
                            { excerpt: { contains: q.q, mode: 'insensitive' } },
                        ],
                    },
                };
            }
            const [rows, total] = await Promise.all([
                this.prisma.post.findMany({
                    where,
                    include: postInclude,
                    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
                    skip: (q.page - 1) * q.pageSize,
                    take: q.pageSize,
                }),
                this.prisma.post.count({ where }),
            ]);
            const items = rows.map((p) => this.summary(p, q.locale)).filter((p) => p !== null);
            return toPage(items, total, q.page, q.pageSize);
        });
    }

    /**
     * Post by slug in a locale. If the slug belongs to another locale's translation
     * (e.g. the language switcher kept the old slug), the post is still found and
     * `slug` tells the web the canonical slug to redirect to.
     */
    bySlug(slug: string, locale: AppLocale) {
        return this.cache.wrap(`post-slug:${locale}:${slug}`, ['posts'], async () => {
            const hit =
                (await this.prisma.postTranslation.findFirst({ where: { slug, locale, post: livePost() } })) ??
                (await this.prisma.postTranslation.findFirst({ where: { slug, post: livePost() } }));
            if (!hit) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
            return this.detail(hit.postId, locale, false);
        });
    }

    /** Full post view. `includeUnpublished` is only used by the signed preview endpoint. */
    async detail(id: string, locale: AppLocale, includeUnpublished: boolean) {
        const post = await this.prisma.post.findFirst({
            where: includeUnpublished ? { id } : { id, ...livePost() },
            include: postInclude,
        });
        if (!post) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        const p = pickTranslation(post.translations, locale);
        if (!p) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });

        const alternates = Object.fromEntries(post.translations.map((t) => [t.locale, t.slug] as const)) as Partial<
            Record<AppLocale, string>
        >;

        const [prev, next, related] =
            post.status === 'PUBLISHED' && post.publishedAt
                ? await Promise.all([
                      this.prisma.post.findFirst({
                          where: { ...livePost(), publishedAt: { lt: post.publishedAt } },
                          orderBy: { publishedAt: 'desc' },
                          include: postInclude,
                      }),
                      this.prisma.post.findFirst({
                          where: { ...livePost(), publishedAt: { gt: post.publishedAt, lte: new Date() } },
                          orderBy: { publishedAt: 'asc' },
                          include: postInclude,
                      }),
                      this.related(post, locale),
                  ])
                : [null, null, []];
        const link = (x: PostFull | null) => {
            const s = x ? this.summary(x, locale) : null;
            return s ? { id: s.id, slug: s.slug, title: s.title } : null;
        };

        return {
            ...this.summary(post, locale),
            status: post.status,
            bodyMarkdown: p.t.bodyMarkdown,
            seoTitle: p.t.seoTitle,
            seoDescription: p.t.seoDescription,
            updatedAt: post.updatedAt,
            alternates,
            availableLocales: availableLocales(post.translations),
            prev: link(prev),
            next: link(next),
            related,
        };
    }

    private async related(post: PostFull, locale: AppLocale) {
        const tagIds = post.tags.map((t) => t.tagId);
        if (!tagIds.length) return [];
        const rows = await this.prisma.post.findMany({
            where: { ...livePost(), id: { not: post.id }, tags: { some: { tagId: { in: tagIds } } } },
            include: postInclude,
            orderBy: { publishedAt: 'desc' },
            take: 12,
        });
        return rows
            .map((r) => ({ r, shared: r.tags.filter((t) => tagIds.includes(t.tagId)).length }))
            .sort((a, b) => b.shared - a.shared)
            .slice(0, 3)
            .map(({ r }) => this.summary(r, locale))
            .filter((x) => x !== null);
    }

    // ── admin ───────────────────────────────────────────────────────────────

    private async changed(id?: string) {
        await this.revalidation.contentChanged(['posts', 'tags', ...(id ? [`post:${id}`] : [])]);
    }

    async adminList(q: { page: number; pageSize: number; status?: PostStatus; q?: string; incomplete?: AppLocale }) {
        const where: Prisma.PostWhereInput = {};
        if (q.status) where.status = q.status;
        if (q.q) where.translations = { some: { title: { contains: q.q, mode: 'insensitive' } } };
        const rows = await this.prisma.post.findMany({ where, include: postInclude, orderBy: { updatedAt: 'desc' } });
        const mapped = rows
            .map((post) => ({
                id: post.id,
                status: post.status,
                featured: post.featured,
                publishedAt: post.publishedAt,
                scheduledAt: post.scheduledAt,
                updatedAt: post.updatedAt,
                needsReview: post.needsReview,
                title: pickTranslation(post.translations, 'en')?.t.title ?? post.translations[0]?.title ?? '',
                completeness: completeness(post.translations, POST_REQUIRED),
            }))
            .filter((p) => !q.incomplete || !p.completeness[q.incomplete].complete);
        const start = (q.page - 1) * q.pageSize;
        return toPage(mapped.slice(start, start + q.pageSize), mapped.length, q.page, q.pageSize);
    }

    async adminGet(id: string) {
        const post = await this.prisma.post.findUnique({ where: { id }, include: postInclude });
        if (!post) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return {
            id: post.id,
            status: post.status,
            featured: post.featured,
            publishedAt: post.publishedAt,
            scheduledAt: post.scheduledAt,
            needsReview: post.needsReview,
            coverMediaId: post.coverMediaId,
            tagIds: post.tags.map((t) => t.tagId),
            translations: post.translations,
            completeness: completeness(post.translations, POST_REQUIRED),
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
        };
    }

    async create(
        dto: PostBaseDto & { translations?: (PostTranslationDto & { locale: AppLocale })[] },
        authorId: string,
    ) {
        await this.assertRefs(dto);
        const post = await this.prisma.post.create({
            data: {
                featured: dto.featured ?? false,
                coverMediaId: dto.coverMediaId ?? null,
                authorId,
                tags: dto.tagIds ? { create: dto.tagIds.map((tagId) => ({ tagId })) } : undefined,
            },
        });
        for (const t of dto.translations ?? []) await this.upsertTranslation(post.id, t.locale, t, false);
        await this.changed(post.id);
        return this.adminGet(post.id);
    }

    async update(id: string, dto: PostBaseDto & { needsReview?: boolean }) {
        await this.ensure(id);
        await this.assertRefs(dto);
        await this.prisma.$transaction(async (tx) => {
            await tx.post.update({
                where: { id },
                data: {
                    featured: dto.featured,
                    coverMediaId: dto.coverMediaId === undefined ? undefined : dto.coverMediaId,
                    needsReview: dto.needsReview,
                },
            });
            if (dto.tagIds) {
                await tx.postTag.deleteMany({ where: { postId: id } });
                if (dto.tagIds.length)
                    await tx.postTag.createMany({ data: dto.tagIds.map((tagId) => ({ postId: id, tagId })) });
            }
        });
        await this.changed(id);
        return this.adminGet(id);
    }

    async upsertTranslation(id: string, locale: AppLocale, dto: PostTranslationDto, notify = true) {
        await this.ensure(id);
        const slug = dto.slug || slugify(dto.title);
        if (!slug) throw new BadRequestException({ i18nKey: 'content.SLUG_REQUIRED', fields: ['slug'] });
        const clash = await this.prisma.postTranslation.findFirst({ where: { locale, slug, postId: { not: id } } });
        if (clash)
            throw new ConflictException({ i18nKey: 'content.SLUG_TAKEN', args: { slug, locale }, fields: ['slug'] });
        const body = dto.bodyMarkdown ?? '';
        const data = {
            title: dto.title,
            slug,
            excerpt: dto.excerpt ?? '',
            bodyMarkdown: body,
            readingTimeMin: readingTimeMin(body),
            seoTitle: dto.seoTitle ?? null,
            seoDescription: dto.seoDescription ?? null,
        };
        await this.prisma.postTranslation.upsert({
            where: { postId_locale: { postId: id, locale } },
            create: { postId: id, locale, ...data },
            update: data,
        });
        if (notify) await this.changed(id);
        return this.adminGet(id);
    }

    async removeTranslation(id: string, locale: AppLocale) {
        const post = await this.ensure(id);
        if (locale === FALLBACK_LOCALE && post.status !== 'DRAFT' && post.status !== 'ARCHIVED') {
            throw new BadRequestException({ i18nKey: 'content.FALLBACK_REQUIRED' });
        }
        await this.prisma.postTranslation.deleteMany({ where: { postId: id, locale } });
        await this.changed(id);
        return this.adminGet(id);
    }

    private async assertPublishable(id: string) {
        const translations = await this.prisma.postTranslation.findMany({ where: { postId: id } });
        const report = completeness(translations, POST_REQUIRED)[FALLBACK_LOCALE];
        if (!report.complete) {
            throw new BadRequestException({
                i18nKey: 'content.FALLBACK_INCOMPLETE',
                args: { missing: report.missing.join(', ') },
                fields: report.missing,
            });
        }
    }

    async publish(id: string) {
        const post = await this.ensure(id);
        await this.assertPublishable(id);
        await this.prisma.post.update({
            where: { id },
            data: { status: 'PUBLISHED', publishedAt: post.publishedAt ?? new Date(), scheduledAt: null },
        });
        await this.changed(id);
        return this.adminGet(id);
    }

    async schedule(id: string, scheduledAt: Date) {
        await this.ensure(id);
        if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now() + 30_000) {
            throw new BadRequestException({ i18nKey: 'content.SCHEDULE_IN_PAST', fields: ['scheduledAt'] });
        }
        await this.assertPublishable(id);
        await this.prisma.post.update({ where: { id }, data: { status: 'SCHEDULED', scheduledAt } });
        await this.changed(id);
        return this.adminGet(id);
    }

    async setStatus(id: string, status: 'DRAFT' | 'ARCHIVED') {
        await this.ensure(id);
        await this.prisma.post.update({ where: { id }, data: { status, scheduledAt: null } });
        await this.changed(id);
        return this.adminGet(id);
    }

    async remove(id: string) {
        await this.ensure(id);
        await this.prisma.post.delete({ where: { id } });
        await this.changed(id);
        return { id, deleted: true };
    }

    /** Cron: publish SCHEDULED posts whose time has come. Returns the ids it published. */
    async publishDue(now = new Date()): Promise<string[]> {
        const due = await this.prisma.post.findMany({ where: { status: 'SCHEDULED', scheduledAt: { lte: now } } });
        const published: string[] = [];
        for (const post of due) {
            // Conditional: a concurrent unpublish/reschedule wins over the cron.
            const res = await this.prisma.post.updateMany({
                where: { id: post.id, status: 'SCHEDULED', scheduledAt: post.scheduledAt },
                data: { status: 'PUBLISHED', publishedAt: post.scheduledAt, scheduledAt: null },
            });
            if (res.count === 1) published.push(post.id);
        }
        if (published.length) {
            await this.revalidation.contentChanged(['posts', 'tags', ...published.map((id) => `post:${id}`)]);
        }
        return published;
    }

    private async ensure(id: string) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return post;
    }

    private async assertRefs(dto: PostBaseDto) {
        if (dto.coverMediaId) {
            const m = await this.prisma.media.findUnique({ where: { id: dto.coverMediaId } });
            if (!m || !m.mime.startsWith('image/')) {
                throw new BadRequestException({ i18nKey: 'content.INVALID_REFERENCE', fields: ['coverMediaId'] });
            }
        }
        if (dto.tagIds?.length) {
            const found = await this.prisma.tag.count({ where: { id: { in: dto.tagIds } } });
            if (found !== new Set(dto.tagIds).size) {
                throw new BadRequestException({ i18nKey: 'content.INVALID_REFERENCE', fields: ['tagIds'] });
            }
        }
    }
}
