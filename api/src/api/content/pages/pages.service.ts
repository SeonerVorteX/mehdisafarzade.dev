import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ContentStatus } from '@prisma/client';
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
import type { PageTranslationDto } from '../common/content.dto';

export const PAGE_REQUIRED: ('title' | 'slug' | 'bodyMarkdown')[] = ['title', 'slug', 'bodyMarkdown'];

/** Simple CMS pages such as /uses (brief §5). Slug unique per locale. */
@Injectable()
export class PagesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
    ) {}

    bySlug(slug: string, locale: AppLocale) {
        return this.cache.wrap(`page:${locale}:${slug}`, ['pages'], async () => {
            const hit =
                (await this.prisma.pageTranslation.findFirst({
                    where: { slug, locale, page: { status: 'PUBLISHED' } },
                })) ??
                (await this.prisma.pageTranslation.findFirst({ where: { slug, page: { status: 'PUBLISHED' } } }));
            if (!hit) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
            return this.detail(hit.pageId, locale, false);
        });
    }

    async detail(id: string, locale: AppLocale, includeUnpublished: boolean) {
        const page = await this.prisma.page.findFirst({
            where: { id, ...(includeUnpublished ? {} : { status: 'PUBLISHED' }) },
            include: { translations: true },
        });
        const t = page ? pickTranslation(page.translations, locale) : null;
        if (!page || !t) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return {
            id: page.id,
            key: page.key,
            locale: t.locale,
            fallback: t.fallback,
            slug: t.t.slug,
            title: t.t.title,
            bodyMarkdown: t.t.bodyMarkdown,
            seoTitle: t.t.seoTitle,
            seoDescription: t.t.seoDescription,
            alternates: Object.fromEntries(page.translations.map((x) => [x.locale, x.slug])),
            availableLocales: availableLocales(page.translations),
            updatedAt: page.updatedAt,
        };
    }

    async adminList() {
        const rows = await this.prisma.page.findMany({ include: { translations: true }, orderBy: { key: 'asc' } });
        return rows.map((p) => ({ ...p, completeness: completeness(p.translations, PAGE_REQUIRED) }));
    }

    async adminGet(id: string) {
        const p = await this.prisma.page.findUnique({ where: { id }, include: { translations: true } });
        if (!p) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return { ...p, completeness: completeness(p.translations, PAGE_REQUIRED) };
    }

    async create(key: string, title: string) {
        if (await this.prisma.page.findUnique({ where: { key } })) {
            throw new ConflictException({
                i18nKey: 'content.SLUG_TAKEN',
                args: { slug: key, locale: '*' },
                fields: ['key'],
            });
        }
        const p = await this.prisma.page.create({ data: { key } });
        await this.upsertTranslation(p.id, FALLBACK_LOCALE, { title, slug: key });
        return this.adminGet(p.id);
    }

    async upsertTranslation(id: string, locale: AppLocale, dto: PageTranslationDto) {
        await this.adminGet(id);
        const slug = dto.slug || slugify(dto.title);
        if (!slug) throw new BadRequestException({ i18nKey: 'content.SLUG_REQUIRED', fields: ['slug'] });
        const clash = await this.prisma.pageTranslation.findFirst({ where: { locale, slug, pageId: { not: id } } });
        if (clash)
            throw new ConflictException({ i18nKey: 'content.SLUG_TAKEN', args: { slug, locale }, fields: ['slug'] });
        const data = {
            title: dto.title,
            slug,
            bodyMarkdown: dto.bodyMarkdown ?? '',
            seoTitle: dto.seoTitle ?? null,
            seoDescription: dto.seoDescription ?? null,
        };
        await this.prisma.pageTranslation.upsert({
            where: { pageId_locale: { pageId: id, locale } },
            create: { pageId: id, locale, ...data },
            update: data,
        });
        await this.changed(id);
        return this.adminGet(id);
    }

    async setStatus(id: string, status: ContentStatus) {
        const p = await this.adminGet(id);
        if (status === 'PUBLISHED' && !p.completeness[FALLBACK_LOCALE].complete) {
            throw new BadRequestException({
                i18nKey: 'content.FALLBACK_INCOMPLETE',
                args: { missing: p.completeness[FALLBACK_LOCALE].missing.join(', ') },
            });
        }
        await this.prisma.page.update({ where: { id }, data: { status } });
        await this.changed(id);
        return this.adminGet(id);
    }

    async remove(id: string) {
        await this.adminGet(id);
        await this.prisma.page.delete({ where: { id } });
        await this.changed(id);
        return { id, deleted: true };
    }

    private changed(id: string) {
        return this.revalidation.contentChanged(['pages', `page:${id}`]);
    }
}
