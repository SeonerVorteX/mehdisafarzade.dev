/**
 * Seed content. Source: the 2026 résumé + GitHub `data.ts` (decision 2026-09-25).
 * Every item is flagged `needsReview` and listed in SEED_REVIEW.md; legacy-only
 * projects are DRAFT (never shown publicly until published in the CMS).
 * az/ru copy is a first draft for review.
 */
import type { ContentStatus, SkillCategory } from '@prisma/client';

type L<T = string> = { en: T; az: T; ru: T };

export const PROFILE = {
    email: 'contact@mehdisafarzade.dev',
    socials: {
        github: 'https://github.com/SeonerVorteX',
        linkedin: 'https://www.linkedin.com/in/mehdi-safarzade',
        // S-01: placeholder until the owner provides the URL; the site hides placeholder links.
        upwork: '<UPWORK_PROFILE_URL>',
    },
    availableForWork: true, // S-05
    t: {
        name: { en: 'Mehdi Safarzade', az: 'Mehdi Səfərzadə', ru: 'Мехди Сафарзаде' },
        headline: { en: 'Full-Stack Developer', az: 'Full-Stack Developer', ru: 'Full-Stack разработчик' },
        pitch: {
            en: 'I design, build and run production platforms end to end with TypeScript, Next.js and NestJS.',
            az: 'TypeScript, Next.js və NestJS ilə istehsal platformalarını başdan-sona layihələndirir, qurur və idarə edirəm.',
            ru: 'Проектирую, разрабатываю и сопровождаю продакшн-платформы от начала до конца на TypeScript, Next.js и NestJS.',
        },
        bio: {
            en:
                "I'm a full-stack developer from Baku, Azerbaijan. I started programming at 15 with JavaScript and Discord bots, " +
                'and have worked professionally since 2021. I specialise in TypeScript-first development with Next.js and NestJS, ' +
                'from system architecture and API design to database modelling and running production on self-managed Linux servers ' +
                "and AWS. I'm studying Information Technology at UNEC.",
            az:
                'Bakıdan olan full-stack developerəm. Proqramlaşdırmaya 15 yaşımda JavaScript və Discord botları ilə başlamışam, ' +
                '2021-ci ildən peşəkar şəkildə işləyirəm. Next.js və NestJS ilə TypeScript əsaslı inkişaf üzrə ixtisaslaşıram: ' +
                'sistem arxitekturası və API dizaynından verilənlər bazasının modelləşdirilməsinə, özüm idarə etdiyim Linux serverlərində ' +
                'və AWS-də istehsal mühitinin idarə olunmasına qədər. UNEC-də İnformasiya Texnologiyaları üzrə təhsil alıram.',
            ru:
                'Я full-stack разработчик из Баку. Начал программировать в 15 лет с JavaScript и Discord-ботов, ' +
                'профессионально работаю с 2021 года. Специализируюсь на разработке на TypeScript с Next.js и NestJS: ' +
                'от архитектуры систем и проектирования API до моделирования баз данных и эксплуатации продакшна на собственных ' +
                'Linux-серверах и AWS. Учусь по специальности «Информационные технологии» в UNEC.',
        },
        seoTitle: {
            en: 'Mehdi Safarzade: Full-Stack Developer',
            az: 'Mehdi Səfərzadə: Full-Stack Developer',
            ru: 'Мехди Сафарзаде: Full-Stack разработчик',
        },
        seoDescription: {
            en: 'Full-stack developer building production platforms with TypeScript, Next.js and NestJS.',
            az: 'TypeScript, Next.js və NestJS ilə istehsal platformaları quran full-stack developer.',
            ru: 'Full-stack разработчик: продакшн-платформы на TypeScript, Next.js и NestJS.',
        },
    } satisfies Record<string, L>,
};

export const SKILLS: { key: string; name: string; category: SkillCategory; featured?: boolean }[] = [
    { key: 'typescript', name: 'TypeScript', category: 'LANGUAGE', featured: true },
    { key: 'javascript', name: 'JavaScript', category: 'LANGUAGE' },
    { key: 'python', name: 'Python', category: 'LANGUAGE' },
    { key: 'nextjs', name: 'Next.js', category: 'FRAMEWORK', featured: true },
    { key: 'react', name: 'React', category: 'FRAMEWORK', featured: true },
    { key: 'nestjs', name: 'NestJS', category: 'FRAMEWORK', featured: true },
    { key: 'nodejs', name: 'Node.js', category: 'FRAMEWORK', featured: true },
    { key: 'express', name: 'Express.js', category: 'FRAMEWORK' },
    { key: 'postgresql', name: 'PostgreSQL', category: 'DATA', featured: true },
    { key: 'prisma', name: 'Prisma', category: 'DATA' },
    { key: 'mongodb', name: 'MongoDB', category: 'DATA' },
    { key: 'redis', name: 'Redis', category: 'DATA' },
    { key: 'rabbitmq', name: 'RabbitMQ', category: 'DATA' },
    { key: 'aws', name: 'AWS', category: 'CLOUD_DEVOPS', featured: true },
    { key: 'docker', name: 'Docker', category: 'CLOUD_DEVOPS', featured: true },
    { key: 'nginx', name: 'Nginx', category: 'CLOUD_DEVOPS' },
    { key: 'linux', name: 'Linux', category: 'CLOUD_DEVOPS' },
    { key: 'cicd', name: 'CI/CD', category: 'CLOUD_DEVOPS' },
    { key: 'turborepo', name: 'Turborepo', category: 'TOOLING' },
    { key: 'scss', name: 'SCSS', category: 'TOOLING' },
    { key: 'tailwind', name: 'Tailwind CSS', category: 'TOOLING' },
    { key: 'git', name: 'Git', category: 'TOOLING' },
    { key: 'socketio', name: 'Socket.io', category: 'TOOLING' },
    { key: 'discordjs', name: 'Discord.js', category: 'TOOLING' },
];

type ExperienceSeed = {
    key: string;
    org: string;
    orgUrl?: string;
    location: string;
    startedAt: string;
    endedAt?: string;
    title: L;
    summary: L;
    bullets: L;
};

export const EXPERIENCE: ExperienceSeed[] = [
    {
        key: 'heroic-art',
        org: 'Heroic.art',
        orgUrl: 'https://heroic.art',
        location: 'Remote',
        startedAt: '2025-03-01',
        title: {
            en: 'Lead Full-Stack Developer',
            az: 'Aparıcı Full-Stack Developer',
            ru: 'Ведущий full-stack разработчик',
        },
        summary: {
            en: 'Sole developer responsible for the whole product lifecycle: architecture, development, deployment and maintenance.',
            az: 'Məhsulun bütün həyat dövrünə (arxitektura, inkişaf, yerləşdirmə və dəstək) cavabdeh olan yeganə developer.',
            ru: 'Единственный разработчик, отвечающий за весь жизненный цикл продукта: архитектуру, разработку, деплой и поддержку.',
        },
        bullets: {
            en: '- Built the frontend with Next.js and Vue 3 and the backend with Node.js and Express, on PostgreSQL.\n- Managed AWS infrastructure (S3, EC2) for hosting, storage and deployment.\n- Worked directly with the client to turn business requirements into technical roadmaps.',
            az: '- Frontend-i Next.js və Vue 3, backend-i Node.js və Express ilə PostgreSQL üzərində qurdum.\n- Hostinq, saxlama və yerləşdirmə üçün AWS infrastrukturunu (S3, EC2) idarə etdim.\n- Biznes tələblərini texniki yol xəritələrinə çevirmək üçün birbaşa müştəri ilə işlədim.',
            ru: '- Разработал фронтенд на Next.js и Vue 3 и бэкенд на Node.js и Express с PostgreSQL.\n- Управлял инфраструктурой AWS (S3, EC2) для хостинга, хранения и деплоя.\n- Работал напрямую с заказчиком, превращая бизнес-требования в технический план.',
        },
    },
    {
        key: 'self-employed-upwork',
        org: 'Self-employed (Upwork)',
        location: 'Remote',
        startedAt: '2024-08-01',
        endedAt: '2025-03-01',
        title: { en: 'Full-Stack Developer', az: 'Full-Stack Developer', ru: 'Full-stack разработчик' },
        summary: {
            en: 'Full-stack projects for international clients via Upwork: Top Rated, 100% Job Success Score.',
            az: 'Upwork vasitəsilə beynəlxalq müştərilər üçün full-stack layihələr: Top Rated, 100% Job Success Score.',
            ru: 'Full-stack проекты для международных клиентов через Upwork: Top Rated, 100% Job Success Score.',
        },
        bullets: {
            en: '- Built full-stack applications and APIs with Next.js, NestJS, TypeScript, PostgreSQL and MongoDB across several client domains.',
            az: '- Müxtəlif müştəri sahələri üçün Next.js, NestJS, TypeScript, PostgreSQL və MongoDB ilə full-stack tətbiqlər və API-lər qurdum.',
            ru: '- Разрабатывал full-stack приложения и API на Next.js, NestJS, TypeScript, PostgreSQL и MongoDB для клиентов из разных сфер.',
        },
    },
    {
        key: 'mobius',
        org: 'Mobius',
        orgUrl: 'https://mobius.az',
        location: 'Remote',
        startedAt: '2024-10-01',
        endedAt: '2024-12-31',
        title: { en: 'Full-Stack Developer', az: 'Full-Stack Developer', ru: 'Full-stack разработчик' },
        summary: {
            en: "Contributed to an agency's production codebase as part of a remote team while studying full-time.",
            az: 'Əyani təhsil alarkən uzaqdan işləyən komandanın üzvü kimi agentliyin istehsal kod bazasına töhfə verdim.',
            ru: 'Работал над продакшн-кодом агентства в удалённой команде, параллельно с очной учёбой.',
        },
        bullets: {
            en: '- Built and integrated RESTful APIs with Node.js and Express on MongoDB.\n- Developed full-stack features across the React frontend and Node.js backend.',
            az: '- MongoDB üzərində Node.js və Express ilə RESTful API-lər qurdum və inteqrasiya etdim.\n- React frontend və Node.js backend üzrə full-stack funksiyalar hazırladım.',
            ru: '- Разрабатывал и интегрировал RESTful API на Node.js и Express с MongoDB.\n- Реализовывал full-stack функциональность во фронтенде на React и бэкенде на Node.js.',
        },
    },
    {
        key: 'bakudevsgroup',
        org: 'BakuDevsGroup',
        location: 'Baku, Azerbaijan (Remote)',
        startedAt: '2021-09-01',
        endedAt: '2022-01-31',
        title: { en: 'Backend Developer', az: 'Backend Developer', ru: 'Backend-разработчик' },
        summary: {
            en: 'Backend services for an early-stage startup project with Node.js and Express.',
            az: 'Erkən mərhələdə olan startap layihəsi üçün Node.js və Express ilə backend xidmətləri.',
            ru: 'Бэкенд-сервисы для стартапа на ранней стадии на Node.js и Express.',
        },
        bullets: {
            en: '- Integrated RESTful APIs for data exchange between client and server layers.',
            az: '- Klient və server qatları arasında məlumat mübadiləsi üçün RESTful API-ləri inteqrasiya etdim.',
            ru: '- Интегрировал RESTful API для обмена данными между клиентом и сервером.',
        },
    },
];

export const EDUCATION = {
    key: 'unec',
    institution: 'Azerbaijan State University of Economics (UNEC)',
    url: 'https://unec.edu.az',
    startedAt: '2023-09-01',
    endedAt: '2027-06-30',
    degree: {
        en: 'B.Sc. Information Technology (in progress)',
        az: 'İnformasiya Texnologiyaları üzrə bakalavr (davam edir)',
        ru: 'Бакалавр, информационные технологии (в процессе)',
    } satisfies L,
};

type ProjectSeed = {
    slug: string;
    status: ContentStatus;
    featured?: boolean;
    order: number;
    repoUrl?: string;
    liveUrl?: string;
    startedAt?: string;
    skills: string[];
    cover?: string;
    title: L;
    summary: L;
    caseStudy?: L;
    role?: L;
};

const same = (s: string): L => ({ en: s, az: s, ru: s });

export const PROJECTS: ProjectSeed[] = [
    {
        slug: 'examination-az',
        status: 'PUBLISHED',
        featured: true,
        order: 0,
        liveUrl: 'https://www.examination.az',
        startedAt: '2024-01-01',
        skills: [
            'nextjs',
            'react',
            'nestjs',
            'typescript',
            'postgresql',
            'prisma',
            'rabbitmq',
            'redis',
            'turborepo',
            'docker',
            'nginx',
        ],
        cover: 'examination-az.png',
        title: same('Examination.az'),
        role: { en: 'Solo developer', az: 'Tək developer', ru: 'Единственный разработчик' },
        summary: {
            en: 'An exam-preparation platform for Azerbaijani university students, used by real students.',
            az: 'Azərbaycan universitet tələbələri üçün real tələbələrin istifadə etdiyi imtahana hazırlıq platforması.',
            ru: 'Платформа подготовки к экзаменам для студентов вузов Азербайджана, которой пользуются реальные студенты.',
        },
        // Public information only (Phase 0 answer 9): nothing from Examination's internal docs.
        caseStudy: {
            en: '## Problem\n\nUniversity students in Azerbaijan needed a focused place to practise for their exams.\n\n## Approach\n\n- A Next.js monorepo (Turborepo + Yarn workspaces) with separate landing, app and admin sub-domains and a shared UI library.\n- A NestJS API on PostgreSQL with Prisma, using RabbitMQ for asynchronous processing during high-load exam sessions.\n- Deployed and operated on a self-managed Linux VPS behind nginx and Cloudflare, with blue/green releases.\n- Interface in Azerbaijani, English, Russian and Turkish.\n\n## Outcome\n\nIn production at examination.az and used by students.',
            az: '## Problem\n\nAzərbaycanda universitet tələbələrinin imtahanlara hazırlaşmaq üçün vahid məkana ehtiyacı var idi.\n\n## Yanaşma\n\n- Ayrıca landing, tətbiq və admin sub-domenləri və ortaq UI kitabxanası olan Next.js monorepo (Turborepo + Yarn workspaces).\n- PostgreSQL və Prisma üzərində NestJS API; yüksək yüklü imtahan sessiyalarında asinxron emal üçün RabbitMQ.\n- nginx və Cloudflare arxasında, blue/green buraxılışlarla özüm idarə etdiyim Linux VPS-də yerləşdirilib.\n- Azərbaycan, ingilis, rus və türk dillərində interfeys.\n\n## Nəticə\n\nexamination.az ünvanında istehsaldadır və tələbələr tərəfindən istifadə olunur.',
            ru: '## Задача\n\nСтудентам вузов Азербайджана нужна была удобная площадка для подготовки к экзаменам.\n\n## Подход\n\n- Монорепозиторий на Next.js (Turborepo + Yarn workspaces) с отдельными поддоменами для лендинга, приложения и админки и общей UI-библиотекой.\n- API на NestJS с PostgreSQL и Prisma; RabbitMQ для асинхронной обработки во время нагруженных экзаменационных сессий.\n- Развёрнут на собственном Linux VPS за nginx и Cloudflare, с blue/green релизами.\n- Интерфейс на азербайджанском, английском, русском и турецком.\n\n## Результат\n\nРаботает в продакшне на examination.az и используется студентами.',
        },
    },
    {
        slug: 'personal-portfolio',
        status: 'DRAFT',
        order: 1,
        repoUrl: 'https://github.com/SeonerVorteX/mehdisafarzade.dev',
        liveUrl: 'https://www.mehdisafarzade.dev',
        skills: [
            'nextjs',
            'nestjs',
            'typescript',
            'postgresql',
            'prisma',
            'rabbitmq',
            'redis',
            'docker',
            'nginx',
            'turborepo',
        ],
        title: same('mehdisafarzade.dev'),
        summary: {
            en: 'This site: a trilingual portfolio with a custom CMS, a NestJS API and a self-hosted deployment.',
            az: 'Bu sayt: xüsusi CMS, NestJS API və öz serverimdə yerləşdirməsi olan üçdilli portfolio.',
            ru: 'Этот сайт: трёхъязычное портфолио с собственной CMS, API на NestJS и self-hosted деплоем.',
        },
    },
    {
        slug: 'project-updater',
        status: 'DRAFT',
        order: 2,
        repoUrl: 'https://github.com/SeonerVorteX/project-updater',
        liveUrl: 'https://www.npmjs.com/package/project-updater',
        skills: ['typescript', 'nodejs', 'socketio'],
        title: same('Project Updater'),
        summary: {
            en: 'An npm package that keeps Node.js project files and dependencies up to date automatically.',
            az: 'Node.js layihə fayllarını və asılılıqlarını avtomatik yeniləyən npm paketi.',
            ru: 'npm-пакет, автоматически обновляющий файлы и зависимости Node.js-проектов.',
        },
    },
    {
        slug: 'discord-moderation-bot',
        status: 'DRAFT',
        order: 3,
        repoUrl: 'https://github.com/SeonerVorteX/discord-moderation-bot',
        skills: ['nodejs', 'discordjs', 'mongodb'],
        title: same('Discord Moderation Bot'),
        summary: {
            en: 'A moderation bot for Discord servers.',
            az: 'Discord serverləri üçün moderasiya botu.',
            ru: 'Бот модерации для Discord-серверов.',
        },
    },
    {
        slug: 'discord-registration-bot',
        status: 'DRAFT',
        order: 4,
        repoUrl: 'https://github.com/SeonerVorteX/discord-register-bot',
        skills: ['nodejs', 'discordjs', 'mongodb'],
        title: same('Discord Registration Bot'),
        summary: {
            en: 'A member registration bot for Discord servers.',
            az: 'Discord serverləri üçün üzv qeydiyyatı botu.',
            ru: 'Бот регистрации участников для Discord-серверов.',
        },
    },
    {
        slug: 'ai-voice-assistant',
        status: 'DRAFT',
        order: 5,
        repoUrl: 'https://github.com/SeonerVorteX/charlie-ai-assistant',
        skills: ['python'],
        title: same('AI Voice Assistant'),
        summary: {
            en: 'A Python voice assistant (TensorFlow, pyttsx3).',
            az: 'Python səs assistenti (TensorFlow, pyttsx3).',
            ru: 'Голосовой ассистент на Python (TensorFlow, pyttsx3).',
        },
    },
    {
        slug: 'live-chat',
        status: 'DRAFT',
        order: 6,
        repoUrl: 'https://github.com/SeonerVorteX/console-live-chat',
        skills: ['nodejs', 'socketio'],
        title: same('Live Chat Application'),
        summary: {
            en: 'A real-time console chat built with Node.js and Socket.io.',
            az: 'Node.js və Socket.io ilə qurulmuş real vaxt konsol çatı.',
            ru: 'Консольный чат в реальном времени на Node.js и Socket.io.',
        },
    },
];

export const SAMPLE_POST = {
    tag: { en: ['Notes', 'notes'], az: ['Qeydlər', 'qeydler'], ru: ['Заметки', 'zametki'] } as L<[string, string]>,
    t: {
        en: {
            title: 'Hello, v2',
            slug: 'hello-v2',
            excerpt: 'Sample post created by the seed. Rewrite or delete before launch.',
            body: '## Sample post\n\nThis post exists so the blog has content in every locale during development.\n\n```ts\nconst hello = (name: string) => `Hello, ${name}`;\n```\n',
        },
        az: {
            title: 'Salam, v2',
            slug: 'salam-v2',
            excerpt: 'Seed tərəfindən yaradılmış nümunə yazı. Buraxılışdan əvvəl yenidən yazın və ya silin.',
            body: '## Nümunə yazı\n\nBu yazı inkişaf zamanı blogun hər dildə məzmunu olsun deyə mövcuddur.\n',
        },
        ru: {
            title: 'Привет, v2',
            slug: 'privet-v2',
            excerpt: 'Пример записи, созданный сидом. Перепишите или удалите перед запуском.',
            body: '## Пример записи\n\nЭта запись нужна, чтобы в блоге был контент на всех языках во время разработки.\n',
        },
    },
};

export const USES_PAGE = {
    key: 'uses',
    t: {
        en: { title: 'Uses', slug: 'uses' },
        az: { title: 'İstifadə etdiklərim', slug: 'uses' },
        ru: { title: 'Чем я пользуюсь', slug: 'uses' },
    },
};
