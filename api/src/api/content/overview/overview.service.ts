import { Injectable } from '@nestjs/common';
import { LOCALES } from 'src/common/constants/locales';
import { ContentCacheService } from 'src/common/helpers/cache/contentCache.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RevalidationService } from 'src/common/helpers/revalidation/revalidation.service';
import { toPage } from 'src/common/dto/query.dto';
import { completeness } from 'src/common/utils/content.util';
import { PAGE_REQUIRED } from '../pages/pages.service';
import { POST_REQUIRED } from '../posts/posts.service';
import { PROFILE_REQUIRED } from '../profile/profile.service';
import { PROJECT_REQUIRED } from '../projects/projects.service';

type ReportRow = {
    kind: 'post' | 'project' | 'page' | 'profile' | 'experience' | 'education';
    id: string;
    label: string;
    needsReview: boolean;
    missing: Record<string, string[]>;
};

/** Admin dashboard helpers: counts, the translations report, audit browsing, "revalidate everything". */
@Injectable()
export class ContentOverviewService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
    ) {}

    async stats() {
        const [posts, projects, pages, media, messages] = await Promise.all([
            this.prisma.post.groupBy({ by: ['status'], _count: true }),
            this.prisma.project.groupBy({ by: ['status'], _count: true }),
            this.prisma.page.groupBy({ by: ['status'], _count: true }),
            this.prisma.media.groupBy({ by: ['status'], _count: true }),
            this.prisma.contactMessage.count({ where: { status: 'NEW' } }),
        ]);
        const byStatus = (rows: { status: string; _count: number }[]) =>
            Object.fromEntries(rows.map((r) => [r.status, r._count]));
        const report = await this.translationsReport();
        return {
            posts: byStatus(posts),
            projects: byStatus(projects),
            pages: byStatus(pages),
            media: byStatus(media),
            unreadMessages: messages,
            incompleteTranslations: report.length,
        };
    }

    /** Every item with a locale that is missing required fields, or flagged needsReview. */
    async translationsReport(): Promise<ReportRow[]> {
        const [posts, projects, pages, profile, experience, education] = await Promise.all([
            this.prisma.post.findMany({ where: { status: { not: 'ARCHIVED' } }, include: { translations: true } }),
            this.prisma.project.findMany({ where: { status: { not: 'ARCHIVED' } }, include: { translations: true } }),
            this.prisma.page.findMany({ include: { translations: true } }),
            this.prisma.siteProfile.findMany({ include: { translations: true } }),
            this.prisma.experience.findMany({ include: { translations: true } }),
            this.prisma.education.findMany({ include: { translations: true } }),
        ]);
        const rows: ReportRow[] = [];
        const add = (
            kind: ReportRow['kind'],
            id: string,
            label: string,
            needsReview: boolean,
            report: Record<string, { complete: boolean; missing: string[] }>,
        ) => {
            const missing = Object.fromEntries(
                LOCALES.filter((l) => !report[l].complete).map((l) => [l, report[l].missing]),
            );
            if (needsReview || Object.keys(missing).length) rows.push({ kind, id, label, needsReview, missing });
        };
        const en = (t: { locale: string; title?: string }[], fallback: string) =>
            t.find((x) => x.locale === 'en')?.title ?? fallback;
        for (const p of posts)
            add('post', p.id, en(p.translations, p.id), p.needsReview, completeness(p.translations, POST_REQUIRED));
        for (const p of projects)
            add(
                'project',
                p.id,
                en(p.translations, p.slug),
                p.needsReview,
                completeness(p.translations, PROJECT_REQUIRED),
            );
        for (const p of pages)
            add('page', p.id, en(p.translations, p.key), false, completeness(p.translations, PAGE_REQUIRED));
        for (const p of profile)
            add('profile', p.id, 'Profile', p.needsReview, completeness(p.translations, PROFILE_REQUIRED));
        for (const e of experience)
            add(
                'experience',
                e.id,
                `${en(e.translations, '')} @ ${e.org}`,
                e.needsReview,
                completeness(e.translations, ['title']),
            );
        for (const e of education)
            add('education', e.id, e.institution, e.needsReview, completeness(e.translations, ['degree']));
        return rows;
    }

    async audit(q: { page: number; pageSize: number; entity?: string; entityId?: string }) {
        const where = {
            ...(q.entity ? { entity: q.entity } : {}),
            ...(q.entityId ? { entityId: q.entityId } : {}),
        };
        const [items, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { at: 'desc' },
                skip: (q.page - 1) * q.pageSize,
                take: q.pageSize,
                include: { admin: { select: { email: true } } },
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return toPage(items, total, q.page, q.pageSize);
    }

    /** Escape hatch: drop the whole API content cache and ask every web instance to revalidate everything. */
    async revalidateAll() {
        await this.cache.invalidateAll();
        const results = await this.revalidation.notifyWeb(['all']);
        return { invalidated: true, web: results };
    }
}
