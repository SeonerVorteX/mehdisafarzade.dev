import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ContentStatus } from '@prisma/client';
import { type AppLocale } from 'src/common/constants/locales';
import { ContentCacheService } from 'src/common/helpers/cache/contentCache.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RevalidationService } from 'src/common/helpers/revalidation/revalidation.service';
import {
    availableLocales,
    completeness,
    FALLBACK_LOCALE,
    pickTranslation,
    slugify,
} from 'src/common/utils/content.util';
import { MediaService } from '../../media/media.service';
import type { ProjectBaseDto, ProjectTranslationDto } from '../common/content.dto';

export const PROJECT_REQUIRED: ('title' | 'summary')[] = ['title', 'summary'];

const include = {
    translations: true,
    cover: { include: { translations: true } },
    skills: { include: { skill: true }, orderBy: { order: 'asc' } },
    gallery: { include: { media: { include: { translations: true } } }, orderBy: { order: 'asc' } },
} satisfies Prisma.ProjectInclude;
type ProjectFull = Prisma.ProjectGetPayload<{ include: typeof include }>;

@Injectable()
export class ProjectsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
    ) {}

    private view(p: ProjectFull, locale: AppLocale, detail: boolean) {
        const t = pickTranslation(p.translations, locale);
        if (!t) return null;
        return {
            id: p.id,
            slug: p.slug,
            locale: t.locale,
            fallback: t.fallback,
            featured: p.featured,
            order: p.order,
            title: t.t.title,
            summary: t.t.summary,
            role: t.t.role,
            repoUrl: p.repoUrl,
            liveUrl: p.liveUrl,
            startedAt: p.startedAt,
            endedAt: p.endedAt,
            cover: MediaService.present(p.cover, locale),
            skills: p.skills.map((s) => ({ key: s.skill.key, name: s.skill.name, category: s.skill.category })),
            ...(detail
                ? {
                      caseStudyMarkdown: t.t.caseStudyMarkdown,
                      seoTitle: t.t.seoTitle,
                      seoDescription: t.t.seoDescription,
                      gallery: p.gallery.map((g) => MediaService.present(g.media, locale)).filter((m) => m !== null),
                      availableLocales: availableLocales(p.translations),
                      updatedAt: p.updatedAt,
                  }
                : {}),
        };
    }

    // ── public ──────────────────────────────────────────────────────────────

    list(locale: AppLocale, featured?: boolean, skill?: string) {
        return this.cache.wrap(
            `projects:${locale}:${featured ?? ''}:${skill ?? ''}`,
            ['projects', 'skills'],
            async () => {
                const rows = await this.prisma.project.findMany({
                    where: {
                        status: 'PUBLISHED',
                        ...(featured !== undefined ? { featured } : {}),
                        ...(skill ? { skills: { some: { skill: { key: skill } } } } : {}),
                    },
                    include,
                    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
                });
                return rows.map((p) => this.view(p, locale, false)).filter((p) => p !== null);
            },
        );
    }

    bySlug(slug: string, locale: AppLocale) {
        return this.cache.wrap(`project:${locale}:${slug}`, ['projects'], () => this.detail({ slug }, locale, false));
    }

    async detail(where: { slug: string } | { id: string }, locale: AppLocale, includeUnpublished: boolean) {
        const p = await this.prisma.project.findFirst({
            where: { ...where, ...(includeUnpublished ? {} : { status: 'PUBLISHED' }) },
            include,
        });
        const v = p ? this.view(p, locale, true) : null;
        if (!v) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return v;
    }

    // ── admin ───────────────────────────────────────────────────────────────

    private changed(id?: string) {
        return this.revalidation.contentChanged(['projects', ...(id ? [`project:${id}`] : [])]);
    }

    async adminList() {
        const rows = await this.prisma.project.findMany({
            include,
            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        });
        return rows.map((p) => ({
            id: p.id,
            slug: p.slug,
            status: p.status,
            featured: p.featured,
            order: p.order,
            needsReview: p.needsReview,
            title: pickTranslation(p.translations, 'en')?.t.title ?? p.slug,
            completeness: completeness(p.translations, PROJECT_REQUIRED),
        }));
    }

    async adminGet(id: string) {
        const p = await this.prisma.project.findUnique({ where: { id }, include });
        if (!p) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return {
            id: p.id,
            slug: p.slug,
            status: p.status,
            featured: p.featured,
            order: p.order,
            needsReview: p.needsReview,
            repoUrl: p.repoUrl,
            liveUrl: p.liveUrl,
            startedAt: p.startedAt,
            endedAt: p.endedAt,
            coverMediaId: p.coverMediaId,
            skillIds: p.skills.map((s) => s.skillId),
            galleryMediaIds: p.gallery.map((g) => g.mediaId),
            translations: p.translations,
            completeness: completeness(p.translations, PROJECT_REQUIRED),
        };
    }

    async create(dto: ProjectBaseDto & { title: string }) {
        const slug = dto.slug || slugify(dto.title);
        await this.assertSlugFree(slug);
        await this.assertRefs(dto);
        const max = await this.prisma.project.aggregate({ _max: { order: true } });
        const p = await this.prisma.project.create({
            data: {
                slug,
                order: (max._max.order ?? -1) + 1,
                translations: { create: { locale: FALLBACK_LOCALE, title: dto.title } },
            },
        });
        await this.update(p.id, dto);
        return this.adminGet(p.id);
    }

    async update(id: string, dto: ProjectBaseDto & { needsReview?: boolean }) {
        const existing = await this.ensure(id);
        if (dto.slug && dto.slug !== existing.slug) await this.assertSlugFree(dto.slug, id);
        await this.assertRefs(dto);
        const date = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(v));
        await this.prisma.$transaction(async (tx) => {
            await tx.project.update({
                where: { id },
                data: {
                    slug: dto.slug,
                    featured: dto.featured,
                    repoUrl: dto.repoUrl,
                    liveUrl: dto.liveUrl,
                    startedAt: date(dto.startedAt),
                    endedAt: date(dto.endedAt),
                    coverMediaId: dto.coverMediaId,
                    needsReview: dto.needsReview,
                },
            });
            if (dto.skillIds) {
                await tx.projectSkill.deleteMany({ where: { projectId: id } });
                await tx.projectSkill.createMany({
                    data: dto.skillIds.map((skillId, order) => ({ projectId: id, skillId, order })),
                });
            }
            if (dto.galleryMediaIds) {
                await tx.projectMedia.deleteMany({ where: { projectId: id } });
                await tx.projectMedia.createMany({
                    data: dto.galleryMediaIds.map((mediaId, order) => ({ projectId: id, mediaId, order })),
                });
            }
        });
        await this.changed(id);
        return this.adminGet(id);
    }

    async upsertTranslation(id: string, locale: AppLocale, dto: ProjectTranslationDto) {
        await this.ensure(id);
        const data = {
            title: dto.title,
            summary: dto.summary ?? '',
            caseStudyMarkdown: dto.caseStudyMarkdown ?? '',
            role: dto.role ?? null,
            seoTitle: dto.seoTitle ?? null,
            seoDescription: dto.seoDescription ?? null,
        };
        await this.prisma.projectTranslation.upsert({
            where: { projectId_locale: { projectId: id, locale } },
            create: { projectId: id, locale, ...data },
            update: data,
        });
        await this.changed(id);
        return this.adminGet(id);
    }

    async removeTranslation(id: string, locale: AppLocale) {
        const p = await this.ensure(id);
        if (locale === FALLBACK_LOCALE && p.status === 'PUBLISHED') {
            throw new BadRequestException({ i18nKey: 'content.FALLBACK_REQUIRED' });
        }
        await this.prisma.projectTranslation.deleteMany({ where: { projectId: id, locale } });
        await this.changed(id);
        return this.adminGet(id);
    }

    async setStatus(id: string, status: ContentStatus) {
        await this.ensure(id);
        if (status === 'PUBLISHED') {
            const t = await this.prisma.projectTranslation.findMany({ where: { projectId: id } });
            const report = completeness(t, PROJECT_REQUIRED)[FALLBACK_LOCALE];
            if (!report.complete) {
                throw new BadRequestException({
                    i18nKey: 'content.FALLBACK_INCOMPLETE',
                    args: { missing: report.missing.join(', ') },
                    fields: report.missing,
                });
            }
        }
        await this.prisma.project.update({ where: { id }, data: { status } });
        await this.changed(id);
        return this.adminGet(id);
    }

    async reorder(ids: string[]) {
        await this.prisma.$transaction(
            ids.map((id, order) => this.prisma.project.update({ where: { id }, data: { order } })),
        );
        await this.changed();
        return this.adminList();
    }

    async remove(id: string) {
        await this.ensure(id);
        await this.prisma.project.delete({ where: { id } });
        await this.changed(id);
        return { id, deleted: true };
    }

    private async ensure(id: string) {
        const p = await this.prisma.project.findUnique({ where: { id } });
        if (!p) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return p;
    }

    private async assertSlugFree(slug: string, exceptId?: string) {
        const clash = await this.prisma.project.findFirst({
            where: { slug, ...(exceptId ? { id: { not: exceptId } } : {}) },
        });
        if (clash)
            throw new ConflictException({
                i18nKey: 'content.SLUG_TAKEN',
                args: { slug, locale: '*' },
                fields: ['slug'],
            });
    }

    private async assertRefs(dto: ProjectBaseDto) {
        const mediaIds = [...(dto.coverMediaId ? [dto.coverMediaId] : []), ...(dto.galleryMediaIds ?? [])];
        if (mediaIds.length) {
            const n = await this.prisma.media.count({
                where: { id: { in: mediaIds }, mime: { startsWith: 'image/' } },
            });
            if (n !== new Set(mediaIds).size)
                throw new BadRequestException({ i18nKey: 'content.INVALID_REFERENCE', fields: ['media'] });
        }
        if (dto.skillIds?.length) {
            const n = await this.prisma.skill.count({ where: { id: { in: dto.skillIds } } });
            if (n !== new Set(dto.skillIds).size)
                throw new BadRequestException({ i18nKey: 'content.INVALID_REFERENCE', fields: ['skillIds'] });
        }
    }
}
