/**
 * Idempotent seed: every write is an upsert on a natural key, so running it
 * twice changes nothing. Run with `yarn prisma:dev:seed` (dotenv -e .env.dev).
 *
 * Existing rows are NOT overwritten (update: {}), so edits made in the CMS
 * survive a re-seed. Only rows that don't exist yet are created.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient, type Locale } from '@prisma/client';
import * as argon from 'argon2';
import { EDUCATION, EXPERIENCE, PROFILE, PROJECTS, SAMPLE_POST, SKILLS, TESTIMONIALS, USES_PAGE } from './seed-data';

const LOCALES: Locale[] = ['en', 'az', 'ru'];
const prisma = new PrismaClient();
const assetsDir = path.join(__dirname, 'seed-assets');

function log(msg: string) {
    process.stdout.write(`[seed] ${msg}\n`);
}

async function s3(): Promise<S3Client | null> {
    const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT } = process.env;
    if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
    const client = new S3Client({
        region: process.env.S3_REGION || 'eu-central-1',
        endpoint: S3_ENDPOINT || undefined,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
    });
    // Local S3 (custom endpoint, dev only): create the bucket on first run. The real
    // AWS bucket is created by the owner and is never touched here.
    if (S3_ENDPOINT && process.env.NODE_ENV !== 'production') {
        try {
            await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
        } catch {
            await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
            log(`created local bucket ${S3_BUCKET}`);
        }
    }
    return client;
}

/** Uploads a seed asset once (keyed by s3Key) and returns its Media id, or null without S3. */
async function seedMedia(client: S3Client | null, file: string, mime: string, alt: string): Promise<string | null> {
    const s3Key = `seed/${file}`;
    const existing = await prisma.media.findUnique({ where: { s3Key } });
    if (existing) return existing.id;
    if (!client) {
        log(`S3 not configured, skipping asset ${file}`);
        return null;
    }
    const body = readFileSync(path.join(assetsDir, file));
    await client.send(
        new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: s3Key, Body: body, ContentType: mime }),
    );
    const media = await prisma.media.create({
        data: {
            s3Key,
            mime,
            size: body.length,
            status: 'READY',
            translations: { create: LOCALES.map((locale) => ({ locale, alt })) },
        },
    });
    log(`uploaded ${s3Key}`);
    return media.id;
}

async function seedAdmin() {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) {
        log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set, skipping admin user');
        return;
    }
    if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
        log(`admin ${email} already exists (password unchanged)`);
        return;
    }
    await prisma.adminUser.create({
        data: { email, passwordHash: await argon.hash(password, { type: argon.argon2id }) },
    });
    log(`admin ${email} created without TOTP: the first login forces enrollment`);
}

async function seedProfile(client: S3Client | null) {
    await prisma.siteProfile.upsert({
        where: { id: 'profile' },
        update: {},
        create: {
            id: 'profile',
            email: PROFILE.email,
            socials: PROFILE.socials,
            availableForFreelance: PROFILE.availableForFreelance,
            availableForRoles: PROFILE.availableForRoles,
            needsReview: true,
            translations: {
                create: LOCALES.map((locale) => ({
                    locale,
                    name: PROFILE.t.name[locale],
                    headline: PROFILE.t.headline[locale],
                    pitch: PROFILE.t.pitch[locale],
                    bioMarkdown: PROFILE.t.bio[locale],
                    seoTitle: PROFILE.t.seoTitle[locale],
                    seoDescription: PROFILE.t.seoDescription[locale],
                })),
            },
        },
    });
    // English résumé only; az/ru are uploaded later via the CMS. The 2026 CV (2026-10-08)
    // supersedes resume-en-2026.pdf. SEED_REVIEW S-10: it must not ship while it still
    // lists a reference's email address.
    const resumeId = await seedMedia(client, 'resume-without-phone.pdf', 'application/pdf', 'Résumé: Mehdi Safarzade');
    if (resumeId) {
        await prisma.profileResume.upsert({
            where: { profileId_locale: { profileId: 'profile', locale: 'en' } },
            update: {},
            create: { profileId: 'profile', locale: 'en', mediaId: resumeId },
        });
    }
}

async function seedSkills() {
    for (const [i, s] of SKILLS.entries()) {
        await prisma.skill.upsert({
            where: { key: s.key },
            update: {},
            create: { key: s.key, name: s.name, category: s.category, featured: !!s.featured, order: i },
        });
    }
}

async function seedExperience() {
    for (const [i, e] of EXPERIENCE.entries()) {
        await prisma.experience.upsert({
            where: { key: e.key },
            update: {},
            create: {
                key: e.key,
                org: e.org,
                orgUrl: e.orgUrl,
                location: e.location,
                startedAt: new Date(e.startedAt),
                endedAt: e.endedAt ? new Date(e.endedAt) : null,
                order: i,
                status: 'PUBLISHED',
                needsReview: true,
                translations: {
                    create: LOCALES.map((locale) => ({
                        locale,
                        title: e.title[locale],
                        summary: e.summary[locale],
                        bulletsMarkdown: e.bullets[locale],
                    })),
                },
            },
        });
    }
    await prisma.education.upsert({
        where: { key: EDUCATION.key },
        update: {},
        create: {
            key: EDUCATION.key,
            institution: EDUCATION.institution,
            url: EDUCATION.url,
            startedAt: new Date(EDUCATION.startedAt),
            endedAt: new Date(EDUCATION.endedAt),
            status: 'PUBLISHED',
            needsReview: true,
            translations: { create: LOCALES.map((locale) => ({ locale, degree: EDUCATION.degree[locale] })) },
        },
    });
}

async function seedProjects(client: S3Client | null) {
    const skills = new Map((await prisma.skill.findMany()).map((s) => [s.key, s.id]));
    for (const p of PROJECTS) {
        if (await prisma.project.findUnique({ where: { slug: p.slug } })) continue;
        const coverMediaId = p.cover ? await seedMedia(client, p.cover, 'image/png', `${p.title.en} screenshot`) : null;
        await prisma.project.create({
            data: {
                slug: p.slug,
                status: p.status,
                featured: !!p.featured,
                order: p.order,
                repoUrl: p.repoUrl,
                liveUrl: p.liveUrl,
                startedAt: p.startedAt ? new Date(p.startedAt) : null,
                coverMediaId,
                needsReview: true,
                translations: {
                    create: LOCALES.map((locale) => ({
                        locale,
                        title: p.title[locale],
                        summary: p.summary[locale],
                        caseStudyMarkdown: p.caseStudy?.[locale] ?? '',
                        role: p.role?.[locale],
                    })),
                },
                skills: {
                    create: p.skills
                        .map((key, order) => ({ skillId: skills.get(key), order }))
                        .filter((s): s is { skillId: string; order: number } => !!s.skillId),
                },
            },
        });
        log(`project ${p.slug} (${p.status})`);
    }
}

async function seedSamplePost() {
    const exists = await prisma.postTranslation.findUnique({
        where: { locale_slug: { locale: 'en', slug: SAMPLE_POST.t.en.slug } },
    });
    if (exists) return;
    const tag = await prisma.tag.create({
        data: {
            translations: {
                create: LOCALES.map((locale) => ({
                    locale,
                    name: SAMPLE_POST.tag[locale][0],
                    slug: SAMPLE_POST.tag[locale][1],
                })),
            },
        },
    });
    await prisma.post.create({
        data: {
            status: 'DRAFT',
            needsReview: true,
            translations: {
                create: LOCALES.map((locale) => ({
                    locale,
                    title: SAMPLE_POST.t[locale].title,
                    slug: SAMPLE_POST.t[locale].slug,
                    excerpt: SAMPLE_POST.t[locale].excerpt,
                    bodyMarkdown: SAMPLE_POST.t[locale].body,
                    readingTimeMin: 1,
                })),
            },
            tags: { create: [{ tagId: tag.id }] },
        },
    });
    log('sample post (DRAFT)');
}

/** Real, verbatim recommendations (2026-10-08). Published, but flagged for the owner's review. */
async function seedTestimonials() {
    for (const [i, t] of TESTIMONIALS.entries()) {
        await prisma.testimonial.upsert({
            where: { key: t.key },
            update: {},
            create: {
                key: t.key,
                quote: t.quote,
                quoteLocale: 'en',
                authorName: t.authorName ?? null,
                source: t.source,
                period: t.period ?? null,
                url: t.url ?? null,
                order: i,
                status: 'PUBLISHED',
                needsReview: true,
                translations: {
                    create: LOCALES.map((locale) => ({
                        locale,
                        authorLabel: t.authorLabel[locale],
                        quoteTranslation: locale === 'en' ? null : t.translation[locale],
                    })),
                },
            },
        });
    }
}

async function seedPages() {
    await prisma.page.upsert({
        where: { key: USES_PAGE.key },
        update: {},
        create: {
            key: USES_PAGE.key,
            status: 'DRAFT',
            needsReview: true,
            translations: {
                create: LOCALES.map((locale) => ({ locale, ...USES_PAGE.t[locale], bodyMarkdown: '' })),
            },
        },
    });
}

/** Same rule as src/assertEnv.ts: outside production, only local databases. */
function assertLocalDatabase() {
    if (process.env.NODE_ENV === 'production') return;
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set (run through dotenv -e .env.dev)');
    const host = new URL(url).hostname;
    if (!/^(localhost|127\.0\.0\.1|::1|portfolio-[a-z0-9-]+)$/i.test(host)) {
        throw new Error(`Refusing to seed "${host}" with NODE_ENV=${process.env.NODE_ENV ?? 'unset'}`);
    }
}

async function main() {
    assertLocalDatabase();
    const client = await s3();
    await seedAdmin();
    await seedProfile(client);
    await seedSkills();
    await seedExperience();
    await seedProjects(client);
    await seedSamplePost();
    await seedTestimonials();
    await seedPages();
    log('done');
}

main()
    .catch((err) => {
        process.stderr.write(`[seed] failed: ${(err as Error).stack ?? String(err)}\n`);
        process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
