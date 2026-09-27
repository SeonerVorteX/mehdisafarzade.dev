import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import sharp from 'sharp';
import request from 'supertest';
import { PublishSchedulerService, PUBLISH_LOCK_KEY } from 'src/api/content/posts/publishScheduler.service';
import { rmqConsumerOptions } from 'src/app.setup';
import { REVALIDATE, S3 } from 'src/common/constants/env';
import { PreviewGuard, signPreview } from 'src/common/guards/preview.guard';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RedisService } from 'src/common/helpers/redis/redis.service';
import { signRevalidation } from 'src/common/helpers/revalidation/revalidation.service';
import { createTestApp, type TestApp } from './utils/app';
import { AdminClient, createAdmin, resetAdminState, signIn } from './utils/admin';

type Hook = { tags: string[]; ok: boolean };

/** Stub of the web app's /api/revalidate: records calls and checks the HMAC exactly like the real route. */
function startWebStub(): Promise<{ server: Server; calls: Hook[] }> {
    const calls: Hook[] = [];
    const server = createServer((req: IncomingMessage, res) => {
        let body = '';
        req.on('data', (c: Buffer) => (body += c.toString()));
        req.on('end', () => {
            const ts = String(req.headers['x-revalidate-timestamp']);
            const ok = req.headers['x-revalidate-signature'] === signRevalidation(body, ts, REVALIDATE.secret);
            calls.push({ tags: (JSON.parse(body) as { tags: string[] }).tags, ok });
            res.writeHead(ok ? 200 : 401).end();
        });
    });
    const port = Number(new URL(REVALIDATE.urls[0]).port);
    return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, calls })));
}

async function waitFor<T>(fn: () => Promise<T | undefined | null | false>, timeoutMs = 15_000): Promise<T> {
    const until = Date.now() + timeoutMs;
    for (;;) {
        const v = await fn();
        if (v) return v;
        if (Date.now() > until) throw new Error('waitFor timed out');
        await new Promise((r) => setTimeout(r, 150));
    }
}

async function resetContent(prisma: PrismaService) {
    await prisma.$transaction([
        prisma.postTag.deleteMany(),
        prisma.postTranslation.deleteMany(),
        prisma.post.deleteMany(),
        prisma.tagTranslation.deleteMany(),
        prisma.tag.deleteMany(),
        prisma.projectSkill.deleteMany(),
        prisma.projectMedia.deleteMany(),
        prisma.projectTranslation.deleteMany(),
        prisma.project.deleteMany(),
        prisma.skill.deleteMany(),
        prisma.experienceTranslation.deleteMany(),
        prisma.experience.deleteMany(),
        prisma.pageTranslation.deleteMany(),
        prisma.page.deleteMany(),
        prisma.profileResume.deleteMany(),
        prisma.siteProfileTranslation.deleteMany(),
        prisma.siteProfile.deleteMany(),
        prisma.mediaTranslation.deleteMany(),
        prisma.media.deleteMany(),
    ]);
}

const FULL_EN = { title: 'Hello world', excerpt: 'An excerpt', bodyMarkdown: 'Some **body** text.' };

describe('content APIs (e2e)', () => {
    let app: TestApp;
    let prisma: PrismaService;
    let admin: AdminClient;
    let web: { server: Server; calls: Hook[] };
    const api = () => request(app.getHttpServer());

    beforeAll(async () => {
        app = await createTestApp();
        // The real RMQ consumer, so writes go API → RabbitMQ → consumer → web webhook end to end.
        app.connectMicroservice(rmqConsumerOptions(), { inheritAppConfig: true });
        await app.startAllMicroservices();
        prisma = app.get(PrismaService);
        web = await startWebStub();
        const s3 = new S3Client({
            region: S3.region,
            endpoint: S3.endpoint,
            forcePathStyle: S3.forcePathStyle,
            credentials: { accessKeyId: S3.accessKeyId, secretAccessKey: S3.secretAccessKey },
        });
        await s3.send(new CreateBucketCommand({ Bucket: S3.bucket })).catch((err: { name?: string }) => {
            if (err.name !== 'BucketAlreadyOwnedByYou' && err.name !== 'BucketAlreadyExists') throw err;
        });
        s3.destroy();
    });

    beforeEach(async () => {
        await resetContent(prisma);
        await resetAdminState(app);
        const { secret } = await createAdmin(app, { totp: true });
        admin = await signIn(app, secret!);
        web.calls.length = 0;
    });

    afterAll(async () => {
        await resetContent(prisma);
        await resetAdminState(app);
        await new Promise((r) => web.server.close(r));
        await app.close();
    });

    const newPost = async (en: Partial<typeof FULL_EN> = FULL_EN) => {
        const res = await admin.post('/posts', { translations: [{ locale: 'en', ...en }] });
        expect(res.status).toBe(201);
        return res.body.data as { id: string };
    };

    describe('posts: publish rules, fallback, slugs', () => {
        it('refuses to publish without a complete en translation, then publishes', async () => {
            const { id } = await newPost({ title: 'Only a title' });
            const refused = await admin.post(`/posts/${id}/publish`);
            expect(refused.status).toBe(400);
            expect(refused.body.errors[0].code).toBe('FALLBACK_INCOMPLETE');
            expect((await api().get('/v1/posts?locale=en')).body.data.items).toHaveLength(0);

            await admin.put(`/posts/${id}/translations/en`, FULL_EN);
            expect((await admin.post(`/posts/${id}/publish`)).status).toBe(200);

            const list = await api().get('/v1/posts?locale=en');
            expect(list.body.data.items).toMatchObject([{ id, slug: 'hello-world', fallback: false }]);
        });

        it('falls back to en for a missing locale and flags it', async () => {
            const { id } = await newPost();
            await admin.post(`/posts/${id}/publish`);
            const az = await api().get('/v1/posts/hello-world?locale=az');
            expect(az.status).toBe(200);
            expect(az.body.data).toMatchObject({ locale: 'en', fallback: true, availableLocales: ['en'] });

            await admin.put(`/posts/${id}/translations/az`, { title: 'Salam dünya', excerpt: 'x', bodyMarkdown: 'y' });
            const az2 = await api().get('/v1/posts/salam-dunya?locale=az');
            expect(az2.body.data).toMatchObject({ locale: 'az', fallback: false, slug: 'salam-dunya' });
            expect(az2.body.data.alternates).toEqual({ en: 'hello-world', az: 'salam-dunya' });
        });

        it('rejects a duplicate slug in the same locale (409) and translates the error', async () => {
            await newPost();
            const dup = await admin.post('/posts', { translations: [{ locale: 'en', title: 'Hello World' }] });
            expect(dup.status).toBe(409);
            const ru = await admin.post('/posts?locale=ru', { translations: [{ locale: 'en', title: 'Hello world' }] });
            expect(ru.body.errors[0]).toMatchObject({ code: 'SLUG_TAKEN', fields: ['slug'] });
            expect(ru.body.errors[0].message).toContain('hello-world');
            expect(ru.body.locale).toBe('ru');
        });

        it('cannot drop the en translation of a published post', async () => {
            const { id } = await newPost();
            await admin.post(`/posts/${id}/publish`);
            expect((await admin.delete(`/posts/${id}/translations/en`)).status).toBe(400);
        });

        it('rejects an unknown locale in the path', async () => {
            const { id } = await newPost();
            const res = await admin.put(`/posts/${id}/translations/de`, FULL_EN);
            expect(res.status).toBe(400);
            expect(res.body.errors[0].code).toBe('UNKNOWN_LOCALE');
        });
    });

    describe('scheduled publishing', () => {
        it('rejects a time in the past, hides a scheduled post, and publishes it when due', async () => {
            const { id } = await newPost();
            const past = await admin.post(`/posts/${id}/schedule`, {
                scheduledAt: new Date(Date.now() - 60_000).toISOString(),
            });
            expect(past.status).toBe(400);
            expect(past.body.errors[0].code).toBe('SCHEDULE_IN_PAST');

            const at = new Date(Date.now() + 10 * 60_000);
            expect((await admin.post(`/posts/${id}/schedule`, { scheduledAt: at.toISOString() })).status).toBe(200);
            expect((await api().get('/v1/posts/hello-world')).status).toBe(404);

            const scheduler = app.get(PublishSchedulerService);
            expect(await scheduler.tick(new Date())).toEqual([]);
            expect(await scheduler.tick(new Date(at.getTime() + 1000))).toEqual([id]);

            const row = await prisma.post.findUniqueOrThrow({ where: { id } });
            expect(row).toMatchObject({ status: 'PUBLISHED', scheduledAt: null });
            expect(row.publishedAt?.toISOString()).toBe(at.toISOString());
        });

        it('only one instance runs a tick (Redis lock)', async () => {
            const { id } = await newPost();
            const at = new Date(Date.now() + 10 * 60_000);
            await admin.post(`/posts/${id}/schedule`, { scheduledAt: at.toISOString() });
            const redis = app.get(RedisService).client;
            await redis.set(PUBLISH_LOCK_KEY, 'other-instance', 'PX', 5000);
            expect(await app.get(PublishSchedulerService).tick(new Date(at.getTime() + 1000))).toBeNull();
            expect(await redis.get(PUBLISH_LOCK_KEY)).toBe('other-instance'); // not released by a non-owner
            await redis.del(PUBLISH_LOCK_KEY);
            expect(await app.get(PublishSchedulerService).tick(new Date(at.getTime() + 1000))).toEqual([id]);
        });
    });

    describe('cache + revalidation', () => {
        it('a write invalidates the API cache and reaches the web webhook with a valid signature', async () => {
            const { id } = await newPost();
            await admin.post(`/posts/${id}/publish`);
            expect((await api().get('/v1/posts/hello-world')).body.data.title).toBe('Hello world');
            // Second read is served from Redis.
            expect((await api().get('/v1/posts/hello-world')).body.data.title).toBe('Hello world');

            web.calls.length = 0;
            await admin.put(`/posts/${id}/translations/en`, { ...FULL_EN, title: 'Hello again', slug: 'hello-world' });
            expect((await api().get('/v1/posts/hello-world')).body.data.title).toBe('Hello again');

            const hook = await waitFor(async () => web.calls.find((c) => c.tags.includes(`post:${id}`)));
            expect(hook.ok).toBe(true);
            expect(hook.tags).toEqual(expect.arrayContaining(['posts', 'tags']));
        });

        it('revalidate/all drops the cache and notifies web', async () => {
            const res = await admin.post('/revalidate/all');
            expect(res.status).toBe(200);
            expect(res.body.data.web).toEqual([{ url: REVALIDATE.urls[0], ok: true, status: 200 }]);
            expect(web.calls.some((c) => c.tags.includes('all') && c.ok)).toBe(true);
        });
    });

    describe('preview', () => {
        it('drafts are visible only with a valid signature', async () => {
            const { id } = await newPost();
            const path = `/v1/preview/posts/${id}`;
            expect((await api().get(path)).status).toBe(404);
            const ts = Math.floor(Date.now() / 1000).toString();
            const bad = await api().get(path).set('x-preview-timestamp', ts).set('x-preview-signature', 'a'.repeat(64));
            expect(bad.status).toBe(404);
            const stale = String(Number(ts) - 3600);
            expect(
                (
                    await api()
                        .get(path)
                        .set('x-preview-timestamp', stale)
                        .set('x-preview-signature', signPreview(path, stale))
                ).status,
            ).toBe(404);
            const ok = await api()
                .get(path)
                .set('x-preview-timestamp', ts)
                .set('x-preview-signature', signPreview(path, ts));
            expect(ok.status).toBe(200);
            expect(ok.body.data).toMatchObject({ id, status: 'DRAFT' });
            expect(PreviewGuard).toBeDefined();
        });
    });

    describe('projects, skills, experience, pages, profile', () => {
        it('project CRUD, skills filter, reorder, publish rules', async () => {
            const skill = (await admin.post('/skills', { name: 'TypeScript', category: 'LANGUAGE' })).body.data;
            const a = (await admin.post('/projects', { title: 'Alpha', skillIds: [skill.id] })).body.data;
            const b = (await admin.post('/projects', { title: 'Beta' })).body.data;
            expect(a.slug).toBe('alpha');

            expect((await admin.post(`/projects/${a.id}/publish`)).body.errors[0].code).toBe('FALLBACK_INCOMPLETE');
            for (const p of [a, b]) {
                await admin.put(`/projects/${p.id}/translations/en`, { title: p.slug, summary: 'S' });
                expect((await admin.post(`/projects/${p.id}/publish`)).status).toBe(200);
            }
            await admin.put('/projects/order', { ids: [b.id, a.id] });
            const list = await api().get('/v1/projects?locale=ru');
            expect((list.body.data as { slug: string }[]).map((p) => p.slug)).toEqual(['beta', 'alpha']);
            const filtered = await api().get('/v1/projects?skill=typescript');
            expect((filtered.body.data as { slug: string }[]).map((p) => p.slug)).toEqual(['alpha']);
            expect((await api().get('/v1/projects/alpha')).body.data.skills).toEqual([
                { key: 'typescript', name: 'TypeScript', category: 'LANGUAGE' },
            ]);
            expect((await admin.post('/projects', { title: 'Alpha' })).status).toBe(409);
            expect((await admin.post('/projects', { title: 'Gamma', skillIds: ['nope'] })).status).toBe(400);
        });

        it('experience timeline and pages', async () => {
            const e = (await admin.post('/experience', { title: 'Engineer', org: 'Acme', startedAt: '2024-01-01' }))
                .body.data;
            expect((await api().get('/v1/experience')).body.data).toEqual([]);
            await admin.post(`/experience/${e.id}/publish`);
            expect((await api().get('/v1/experience?locale=az')).body.data).toMatchObject([
                { org: 'Acme', title: 'Engineer', current: true, fallback: true },
            ]);

            const page = (await admin.post('/pages', { key: 'uses', title: 'Uses' })).body.data;
            expect((await admin.post(`/pages/${page.id}/publish`)).status).toBe(400); // body missing
            await admin.put(`/pages/${page.id}/translations/en`, {
                title: 'Uses',
                slug: 'uses',
                bodyMarkdown: '- vim',
            });
            await admin.post(`/pages/${page.id}/publish`);
            expect((await api().get('/v1/pages/uses')).body.data).toMatchObject({ key: 'uses', bodyMarkdown: '- vim' });
        });

        it('profile: placeholder socials hidden, bad socials rejected', async () => {
            await prisma.siteProfile.create({ data: { id: 'profile', email: 'contact@e2e.test', socials: {} } });
            expect((await api().get('/v1/profile')).status).toBe(404);
            await admin.put('/profile/translations/en', { name: 'Mehdi', headline: 'Engineer', pitch: 'Hi' });
            const bad = await admin.patch('/profile', { socials: { myspace: 'https://myspace.com/x' } });
            expect(bad.status).toBe(400);
            expect(bad.body.errors[0].code).toBe('INVALID_SOCIAL');
            await admin.patch('/profile', {
                socials: { github: 'https://github.com/x', upwork: '<UPWORK_URL>' },
            });
            const pub = await api().get('/v1/profile?locale=ru');
            expect(pub.body.data).toMatchObject({
                name: 'Mehdi',
                fallback: true,
                socials: { github: 'https://github.com/x' },
            });
            expect(pub.body.data.socials.upwork).toBeUndefined();
            expect(pub.body.data.resume).toBeNull();
        });
    });

    describe('admin overview + audit', () => {
        it('reports incomplete translations, counts, and audits mutations', async () => {
            const { id } = await newPost();
            const report = (await admin.get('/translations/report')).body.data as { id: string; missing: object }[];
            expect(report.find((r) => r.id === id)?.missing).toEqual(
                expect.objectContaining({ az: expect.any(Array), ru: expect.any(Array) }),
            );
            const stats = (await admin.get('/stats')).body.data;
            expect(stats.posts).toEqual({ DRAFT: 1 });

            await waitFor(async () => (await prisma.auditLog.count({ where: { action: 'post.create' } })) > 0);
            const audit = (await admin.get('/audit?entity=post')).body.data;
            expect(audit.items[0]).toMatchObject({
                action: 'post.create',
                entity: 'post',
                entityId: id,
                deviceName: 'pc',
            });
        });
    });

    describe('media pipeline', () => {
        const upload = async (buf: Buffer, mime: string) => {
            const pre = await admin.post('/media/presign', { filename: 'x', mime, size: buf.length });
            expect(pre.status).toBe(200);
            const { media, upload } = pre.body.data as { media: { id: string }; upload: { url: string } };
            const put = await fetch(upload.url, { method: 'PUT', headers: { 'Content-Type': mime }, body: buf });
            if (put.status !== 200) throw new Error(`PUT ${put.status}: ${await put.text()} URL=${upload.url}`);
            return { id: media.id, finalize: () => admin.post(`/media/${media.id}/finalize`) };
        };

        it('presign → PUT → finalize → variants via RMQ → public redirect; delete protection', async () => {
            const png = await sharp({ create: { width: 1000, height: 600, channels: 3, background: '#3a6' } })
                .png()
                .toBuffer();
            const { id, finalize } = await upload(png, 'image/png');
            expect((await finalize()).status).toBe(200);

            const ready = await waitFor(async () => {
                const m = await prisma.media.findUnique({ where: { id } });
                return m?.status === 'READY' ? m : null;
            });
            expect(ready).toMatchObject({ width: 1000, height: 600 });
            expect(ready.lqip).toMatch(/^data:image\/webp;base64,/);
            expect((await admin.get(`/media/${id}`)).body.data.variants).toEqual(
                expect.arrayContaining(['avif-480', 'avif-960', 'webp-480', 'webp-960']),
            );

            const redirect = await api().get(`/v1/media/${id}/webp-960`);
            expect(redirect.status).toBe(302);
            const img = await fetch(redirect.headers.location);
            expect(img.status).toBe(200);
            expect((await sharp(Buffer.from(await img.arrayBuffer())).metadata()).format).toBe('webp');
            // Image originals are never served (EXIF), nor are unknown variants.
            expect((await api().get(`/v1/media/${id}/original`)).status).toBe(404);
            expect((await api().get(`/v1/media/${id}/webp-1600`)).status).toBe(404);

            const project = (await admin.post('/projects', { title: 'With cover', coverMediaId: id })).body.data;
            const del = await admin.delete(`/media/${id}`);
            expect(del.status).toBe(409);
            expect(del.body.errors[0].code).toBe('IN_USE');
            await admin.delete(`/projects/${project.id}`);
            expect((await admin.delete(`/media/${id}`)).status).toBe(200);
        });

        it('rejects content that does not match the declared type', async () => {
            const { id, finalize } = await upload(Buffer.from('definitely not a png file'), 'image/png');
            const res = await finalize();
            expect(res.status).toBe(400);
            expect(res.body.errors[0].code).toBe('TYPE_MISMATCH');
            expect((await prisma.media.findUniqueOrThrow({ where: { id } })).status).toBe('FAILED');
        });

        it('the presigned URL is bound to the declared type and size', async () => {
            const pre = await admin.post('/media/presign', { filename: 'x.png', mime: 'image/png', size: 10 });
            const url = (pre.body.data as { upload: { url: string } }).upload.url;
            const wrongType = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'text/html' },
                body: Buffer.alloc(10),
            });
            expect(wrongType.status).toBe(403);
            const wrongSize = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'image/png' },
                body: Buffer.alloc(11),
            });
            expect(wrongSize.ok).toBe(false);
        });

        it('rejects disallowed types and oversize files before presigning', async () => {
            expect(
                (await admin.post('/media/presign', { filename: 'a.svg', mime: 'image/svg+xml', size: 10 })).status,
            ).toBe(400);
            const big = await admin.post('/media/presign', {
                filename: 'a.pdf',
                mime: 'application/pdf',
                size: 50 * 1024 * 1024,
            });
            expect(big.body.errors[0].code).toBe('TOO_LARGE');
        });
    });
});
