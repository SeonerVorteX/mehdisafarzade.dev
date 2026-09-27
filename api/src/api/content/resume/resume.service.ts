import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ContentStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { type AppLocale } from 'src/common/constants/locales';
import { ContentCacheService } from 'src/common/helpers/cache/contentCache.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RevalidationService } from 'src/common/helpers/revalidation/revalidation.service';
import { completeness, FALLBACK_LOCALE, pickTranslation } from 'src/common/utils/content.util';
import type {
    EducationBaseDto,
    EducationTranslationDto,
    ExperienceBaseDto,
    ExperienceTranslationDto,
} from '../common/content.dto';

/** Experience timeline + education (brief §5 home/about). Both: base row + per-locale translations, publish, reorder. */
@Injectable()
export class ResumeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
    ) {}

    // ── public ──────────────────────────────────────────────────────────────

    experience(locale: AppLocale) {
        return this.cache.wrap(`experience:${locale}`, ['experience'], async () => {
            const rows = await this.prisma.experience.findMany({
                where: { status: 'PUBLISHED' },
                include: { translations: true },
                orderBy: [{ order: 'asc' }, { startedAt: 'desc' }],
            });
            return rows
                .map((e) => {
                    const t = pickTranslation(e.translations, locale);
                    if (!t) return null;
                    return {
                        id: e.id,
                        org: e.org,
                        orgUrl: e.orgUrl,
                        location: e.location,
                        startedAt: e.startedAt,
                        endedAt: e.endedAt,
                        current: e.endedAt === null,
                        locale: t.locale,
                        fallback: t.fallback,
                        title: t.t.title,
                        summary: t.t.summary,
                        bulletsMarkdown: t.t.bulletsMarkdown,
                    };
                })
                .filter((e) => e !== null);
        });
    }

    education(locale: AppLocale) {
        return this.cache.wrap(`education:${locale}`, ['education'], async () => {
            const rows = await this.prisma.education.findMany({
                where: { status: 'PUBLISHED' },
                include: { translations: true },
                orderBy: [{ order: 'asc' }, { startedAt: 'desc' }],
            });
            return rows
                .map((e) => {
                    const t = pickTranslation(e.translations, locale);
                    if (!t) return null;
                    return {
                        id: e.id,
                        institution: e.institution,
                        url: e.url,
                        startedAt: e.startedAt,
                        endedAt: e.endedAt,
                        locale: t.locale,
                        fallback: t.fallback,
                        degree: t.t.degree,
                        summary: t.t.summary,
                    };
                })
                .filter((e) => e !== null);
        });
    }

    // ── admin: experience ───────────────────────────────────────────────────

    async experienceAdminList() {
        const rows = await this.prisma.experience.findMany({
            include: { translations: true },
            orderBy: { order: 'asc' },
        });
        return rows.map((e) => ({ ...e, completeness: completeness(e.translations, ['title']) }));
    }

    async experienceCreate(dto: ExperienceBaseDto & { title: string }) {
        if (!dto.org || !dto.startedAt) {
            throw new BadRequestException({ i18nKey: 'content.MISSING_FIELDS', fields: ['org', 'startedAt'] });
        }
        const max = await this.prisma.experience.aggregate({ _max: { order: true } });
        const e = await this.prisma.experience.create({
            data: {
                key: `exp-${randomUUID().slice(0, 8)}`,
                org: dto.org,
                orgUrl: dto.orgUrl ?? null,
                location: dto.location ?? null,
                startedAt: new Date(dto.startedAt),
                endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
                order: (max._max.order ?? -1) + 1,
                translations: { create: { locale: FALLBACK_LOCALE, title: dto.title } },
            },
            include: { translations: true },
        });
        await this.changed('experience');
        return e;
    }

    async experienceUpdate(id: string, dto: ExperienceBaseDto & { needsReview?: boolean }) {
        await this.ensure('experience', id);
        const e = await this.prisma.experience.update({
            where: { id },
            data: {
                org: dto.org,
                orgUrl: dto.orgUrl,
                location: dto.location,
                startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
                endedAt: dto.endedAt === undefined ? undefined : dto.endedAt === null ? null : new Date(dto.endedAt),
                needsReview: dto.needsReview,
            },
            include: { translations: true },
        });
        await this.changed('experience');
        return e;
    }

    async experienceTranslate(id: string, locale: AppLocale, dto: ExperienceTranslationDto) {
        await this.ensure('experience', id);
        const data = { title: dto.title, summary: dto.summary ?? '', bulletsMarkdown: dto.bulletsMarkdown ?? '' };
        await this.prisma.experienceTranslation.upsert({
            where: { experienceId_locale: { experienceId: id, locale } },
            create: { experienceId: id, locale, ...data },
            update: data,
        });
        await this.changed('experience');
        return this.prisma.experience.findUniqueOrThrow({ where: { id }, include: { translations: true } });
    }

    // ── admin: education ────────────────────────────────────────────────────

    async educationAdminList() {
        const rows = await this.prisma.education.findMany({
            include: { translations: true },
            orderBy: { order: 'asc' },
        });
        return rows.map((e) => ({ ...e, completeness: completeness(e.translations, ['degree']) }));
    }

    async educationCreate(dto: EducationBaseDto & { degree: string }) {
        if (!dto.institution || !dto.startedAt) {
            throw new BadRequestException({ i18nKey: 'content.MISSING_FIELDS', fields: ['institution', 'startedAt'] });
        }
        const max = await this.prisma.education.aggregate({ _max: { order: true } });
        const e = await this.prisma.education.create({
            data: {
                key: `edu-${randomUUID().slice(0, 8)}`,
                institution: dto.institution,
                url: dto.url ?? null,
                startedAt: new Date(dto.startedAt),
                endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
                order: (max._max.order ?? -1) + 1,
                translations: { create: { locale: FALLBACK_LOCALE, degree: dto.degree } },
            },
            include: { translations: true },
        });
        await this.changed('education');
        return e;
    }

    async educationUpdate(id: string, dto: EducationBaseDto & { needsReview?: boolean }) {
        await this.ensure('education', id);
        const e = await this.prisma.education.update({
            where: { id },
            data: {
                institution: dto.institution,
                url: dto.url,
                startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
                endedAt: dto.endedAt === undefined ? undefined : dto.endedAt === null ? null : new Date(dto.endedAt),
                needsReview: dto.needsReview,
            },
            include: { translations: true },
        });
        await this.changed('education');
        return e;
    }

    async educationTranslate(id: string, locale: AppLocale, dto: EducationTranslationDto) {
        await this.ensure('education', id);
        const data = { degree: dto.degree, summary: dto.summary ?? '' };
        await this.prisma.educationTranslation.upsert({
            where: { educationId_locale: { educationId: id, locale } },
            create: { educationId: id, locale, ...data },
            update: data,
        });
        await this.changed('education');
        return this.prisma.education.findUniqueOrThrow({ where: { id }, include: { translations: true } });
    }

    // ── shared ──────────────────────────────────────────────────────────────

    async setStatus(kind: 'experience' | 'education', id: string, status: ContentStatus) {
        await this.ensure(kind, id);
        if (status === 'PUBLISHED') {
            const field = kind === 'experience' ? 'title' : 'degree';
            const translations =
                kind === 'experience'
                    ? await this.prisma.experienceTranslation.findMany({ where: { experienceId: id } })
                    : await this.prisma.educationTranslation.findMany({ where: { educationId: id } });
            if (
                !completeness(translations as { locale: string; [k: string]: unknown }[], [field])[FALLBACK_LOCALE]
                    .complete
            ) {
                throw new BadRequestException({ i18nKey: 'content.FALLBACK_INCOMPLETE', args: { missing: field } });
            }
        }
        if (kind === 'experience') await this.prisma.experience.update({ where: { id }, data: { status } });
        else await this.prisma.education.update({ where: { id }, data: { status } });
        await this.changed(kind);
        return { id, status };
    }

    async reorder(kind: 'experience' | 'education', ids: string[]) {
        await this.prisma.$transaction(
            ids.map((id, order) =>
                kind === 'experience'
                    ? this.prisma.experience.update({ where: { id }, data: { order } })
                    : this.prisma.education.update({ where: { id }, data: { order } }),
            ),
        );
        await this.changed(kind);
        return kind === 'experience' ? this.experienceAdminList() : this.educationAdminList();
    }

    async remove(kind: 'experience' | 'education', id: string) {
        await this.ensure(kind, id);
        if (kind === 'experience') await this.prisma.experience.delete({ where: { id } });
        else await this.prisma.education.delete({ where: { id } });
        await this.changed(kind);
        return { id, deleted: true };
    }

    private async ensure(kind: 'experience' | 'education', id: string) {
        const n =
            kind === 'experience'
                ? await this.prisma.experience.count({ where: { id } })
                : await this.prisma.education.count({ where: { id } });
        if (!n) throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
    }

    private changed(kind: 'experience' | 'education') {
        return this.revalidation.contentChanged([kind]);
    }
}
