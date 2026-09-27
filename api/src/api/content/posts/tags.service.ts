import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type AppLocale } from 'src/common/constants/locales';
import { ContentCacheService } from 'src/common/helpers/cache/contentCache.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RevalidationService } from 'src/common/helpers/revalidation/revalidation.service';
import { completeness, pickTranslation, slugify } from 'src/common/utils/content.util';
import type { TagTranslationDto } from '../common/content.dto';

@Injectable()
export class TagsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
    ) {}

    /** Public: tags that have at least one live post, with counts. */
    list(locale: AppLocale) {
        return this.cache.wrap(`tags:${locale}`, ['tags', 'posts'], async () => {
            const now = new Date();
            const tags = await this.prisma.tag.findMany({
                include: {
                    translations: true,
                    _count: {
                        select: { posts: { where: { post: { status: 'PUBLISHED', publishedAt: { lte: now } } } } },
                    },
                },
            });
            return tags
                .filter((t) => t._count.posts > 0)
                .map((t) => {
                    const p = pickTranslation(t.translations, locale);
                    return p
                        ? { id: t.id, name: p.t.name, slug: p.t.slug, locale: p.locale, count: t._count.posts }
                        : null;
                })
                .filter((t) => t !== null)
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
        });
    }

    async adminList() {
        const tags = await this.prisma.tag.findMany({
            include: { translations: true, _count: { select: { posts: true } } },
        });
        return tags.map((t) => ({
            id: t.id,
            translations: t.translations,
            posts: t._count.posts,
            completeness: completeness(t.translations, ['name', 'slug']),
        }));
    }

    async create(translations: (TagTranslationDto & { locale: AppLocale })[]) {
        const tag = await this.prisma.tag.create({ data: {} });
        for (const t of translations) await this.upsertTranslation(tag.id, t.locale, t, false);
        await this.changed();
        return this.adminGet(tag.id);
    }

    async adminGet(id: string) {
        const tag = await this.prisma.tag.findUnique({ where: { id }, include: { translations: true } });
        if (!tag) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return {
            id: tag.id,
            translations: tag.translations,
            completeness: completeness(tag.translations, ['name', 'slug']),
        };
    }

    async upsertTranslation(id: string, locale: AppLocale, dto: TagTranslationDto, notify = true) {
        await this.adminGet(id);
        const slug = dto.slug || slugify(dto.name);
        if (!slug) throw new BadRequestException({ i18nKey: 'content.SLUG_REQUIRED', fields: ['slug'] });
        const clash = await this.prisma.tagTranslation.findFirst({ where: { locale, slug, tagId: { not: id } } });
        if (clash)
            throw new ConflictException({ i18nKey: 'content.SLUG_TAKEN', args: { slug, locale }, fields: ['slug'] });
        await this.prisma.tagTranslation.upsert({
            where: { tagId_locale: { tagId: id, locale } },
            create: { tagId: id, locale, name: dto.name, slug },
            update: { name: dto.name, slug },
        });
        if (notify) await this.changed();
        return this.adminGet(id);
    }

    async remove(id: string) {
        await this.adminGet(id);
        await this.prisma.tag.delete({ where: { id } });
        await this.changed();
        return { id, deleted: true };
    }

    private changed() {
        return this.revalidation.contentChanged(['tags', 'posts']);
    }
}
