import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type AppLocale } from 'src/common/constants/locales';
import { ContentCacheService } from 'src/common/helpers/cache/contentCache.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RevalidationService } from 'src/common/helpers/revalidation/revalidation.service';
import { completeness, isPlaceholder, pickTranslation } from 'src/common/utils/content.util';
import type { ProfileBaseDto, ProfileTranslationDto } from '../common/content.dto';

const PROFILE_ID = 'profile';
export const PROFILE_REQUIRED: ('name' | 'headline' | 'pitch')[] = ['name', 'headline', 'pitch'];
/** Socials the site knows how to render; anything else is rejected. */
export const SOCIAL_KEYS = ['github', 'linkedin', 'upwork', 'x', 'telegram', 'stackoverflow'] as const;

/** Site profile singleton: identity, socials, availability, per-locale résumé (brief §6). */
@Injectable()
export class ProfileService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
    ) {}

    get(locale: AppLocale) {
        return this.cache.wrap(`profile:${locale}`, ['profile'], async () => {
            const p = await this.prisma.siteProfile.findUnique({
                where: { id: PROFILE_ID },
                include: { translations: true, resumes: { include: { media: true } } },
            });
            const t = p ? pickTranslation(p.translations, locale) : null;
            if (!p || !t) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
            const socials = Object.fromEntries(
                Object.entries((p.socials ?? {}) as Record<string, string>).filter(([, url]) => !isPlaceholder(url)),
            );
            // The résumé is shown only for a locale that actually has one (decision: no cross-locale fallback).
            const resume = p.resumes.find((r) => r.locale === locale && r.media.status === 'READY');
            return {
                email: p.email,
                socials,
                availableForWork: p.availableForWork,
                locale: t.locale,
                fallback: t.fallback,
                name: t.t.name,
                headline: t.t.headline,
                pitch: t.t.pitch,
                bioMarkdown: t.t.bioMarkdown,
                seoTitle: t.t.seoTitle,
                seoDescription: t.t.seoDescription,
                resume: resume ? { mediaId: resume.mediaId, locale: resume.locale } : null,
                resumeLocales: p.resumes.filter((r) => r.media.status === 'READY').map((r) => r.locale),
            };
        });
    }

    async adminGet() {
        const p = await this.prisma.siteProfile.findUnique({
            where: { id: PROFILE_ID },
            include: { translations: true, resumes: true },
        });
        if (!p) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
        return { ...p, completeness: completeness(p.translations, PROFILE_REQUIRED) };
    }

    async update(dto: ProfileBaseDto & { needsReview?: boolean }) {
        if (dto.socials) this.validateSocials(dto.socials);
        await this.prisma.siteProfile.update({
            where: { id: PROFILE_ID },
            data: {
                email: dto.email,
                availableForWork: dto.availableForWork,
                socials: dto.socials,
                needsReview: dto.needsReview,
            },
        });
        await this.changed();
        return this.adminGet();
    }

    async upsertTranslation(locale: AppLocale, dto: ProfileTranslationDto) {
        const data = {
            name: dto.name,
            headline: dto.headline,
            pitch: dto.pitch ?? '',
            bioMarkdown: dto.bioMarkdown ?? '',
            seoTitle: dto.seoTitle ?? null,
            seoDescription: dto.seoDescription ?? null,
        };
        await this.prisma.siteProfileTranslation.upsert({
            where: { profileId_locale: { profileId: PROFILE_ID, locale } },
            create: { profileId: PROFILE_ID, locale, ...data },
            update: data,
        });
        await this.changed();
        return this.adminGet();
    }

    async setResume(locale: AppLocale, mediaId: string) {
        const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
        if (!media || media.mime !== 'application/pdf') {
            throw new BadRequestException({ i18nKey: 'content.INVALID_REFERENCE', fields: ['mediaId'] });
        }
        await this.prisma.profileResume.upsert({
            where: { profileId_locale: { profileId: PROFILE_ID, locale } },
            create: { profileId: PROFILE_ID, locale, mediaId },
            update: { mediaId },
        });
        await this.changed();
        return this.adminGet();
    }

    async removeResume(locale: AppLocale) {
        await this.prisma.profileResume.deleteMany({ where: { profileId: PROFILE_ID, locale } });
        await this.changed();
        return this.adminGet();
    }

    private validateSocials(socials: Record<string, unknown>) {
        for (const [key, value] of Object.entries(socials)) {
            const ok =
                (SOCIAL_KEYS as readonly string[]).includes(key) &&
                typeof value === 'string' &&
                (isPlaceholder(value) || /^https:\/\/[^\s]+$/.test(value));
            if (!ok)
                throw new BadRequestException({
                    i18nKey: 'content.INVALID_SOCIAL',
                    args: { key },
                    fields: [`socials.${key}`],
                });
        }
    }

    private changed() {
        return this.revalidation.contentChanged(['profile']);
    }
}
