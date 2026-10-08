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
        upwork: 'https://www.upwork.com/freelancers/mehdisafarzade',
    },
    // Two independent flags, managed in the admin (2026-10-08): employed at Prodata, open to
    // freelance projects alongside the job and to full/part-time roles.
    availableForFreelance: true,
    availableForRoles: true,
    t: {
        name: { en: 'Mehdi Safarzade', az: 'Mehdi Səfərzadə', ru: 'Мехди Сафарзаде' },
        headline: {
            en: 'Full-Stack Web Developer & AI Engineer',
            az: 'Full-Stack Veb Developer və AI Mühəndisi',
            ru: 'Full-stack веб-разработчик и AI-инженер',
        },
        pitch: {
            en: 'I build whole web products on my own, from the data model and API to the interface and the server it runs on. Lately I also build AI systems: RAG pipelines and multi-agent assistants in production.',
            az: 'Veb məhsulları başdan-sona özüm qururam: verilənlər modelindən və API-dən interfeysə və onun işlədiyi serverə qədər. Son vaxtlar AI sistemləri də qururam: istehsalda işləyən RAG pipeline-ları və çoxagentli assistentlər.',
            ru: 'Я делаю веб-продукты целиком сам: от модели данных и API до интерфейса и сервера, на котором всё работает. В последнее время делаю и AI-системы: RAG-пайплайны и мультиагентных ассистентов в продакшне.',
        },
        bio: {
            en:
                "I'm a full-stack developer from Baku, Azerbaijan. I started programming at 15 with JavaScript and Discord bots " +
                'and have worked professionally since 2021. Most of my work is TypeScript with Next.js and NestJS: system architecture, ' +
                'API design, database modelling, and running production on my own Linux servers and AWS.\n\n' +
                "Right now I'm an AI and Data Engineer at Prodata, building an assistant that answers agricultural questions: " +
                'a RAG pipeline over domain documents and live data, with several specialist agents behind one conversation.\n\n' +
                'I often own a product alone, but I also work inside remote teams (Mobius, and Heroic.art, where the owner ' +
                'handled QA and planning). I speak Azerbaijani natively and English at an upper-intermediate (B2+) level. ' +
                "I'm based in Baku (UTC+4), which overlaps with European working hours, and I'm studying Information Technology at UNEC.",
            az:
                'Bakıdan olan full-stack developerəm. Proqramlaşdırmaya 15 yaşımda JavaScript və Discord botları ilə başlamışam, ' +
                '2021-ci ildən peşəkar şəkildə işləyirəm. İşimin çoxu Next.js və NestJS ilə TypeScript-dir: sistem arxitekturası, ' +
                'API dizaynı, verilənlər bazasının modelləşdirilməsi və istehsal mühitinin öz Linux serverlərimdə və AWS-də idarə olunması.\n\n' +
                'Hazırda Prodata-da AI və Data Mühəndisiyəm: kənd təsərrüfatı suallarına cavab verən assistent qururam. ' +
                'Bu, sahə sənədləri və canlı məlumatlar üzərində RAG pipeline-dır, bir söhbətin arxasında bir neçə ixtisaslaşmış agent işləyir.\n\n' +
                'Çox vaxt məhsula tək cavabdeh oluram, amma uzaqdan işləyən komandalarda da çalışıram (Mobius və Heroic.art, ' +
                'burada QA və planlamanı sahibkar aparırdı). Azərbaycan dili ana dilimdir, ingilis dilini B2+ səviyyəsində bilirəm. ' +
                'Bakıda yaşayıram (UTC+4), bu da Avropa iş saatları ilə üst-üstə düşür. UNEC-də İnformasiya Texnologiyaları üzrə oxuyuram.',
            ru:
                'Я full-stack разработчик из Баку. Начал программировать в 15 лет с JavaScript и Discord-ботов, ' +
                'профессионально работаю с 2021 года. В основном пишу на TypeScript с Next.js и NestJS: архитектура систем, ' +
                'проектирование API, моделирование баз данных и эксплуатация продакшна на собственных Linux-серверах и AWS.\n\n' +
                'Сейчас я AI- и дата-инженер в Prodata: делаю ассистента, который отвечает на вопросы о сельском хозяйстве. ' +
                'Это RAG-пайплайн по отраслевым документам и живым данным, где за одним диалогом работают несколько специализированных агентов.\n\n' +
                'Часто я веду продукт в одиночку, но работаю и в удалённых командах (Mobius и Heroic.art, где владелец агентства ' +
                'отвечал за QA и планирование). Азербайджанский у меня родной, английский на уровне B2+. ' +
                'Живу в Баку (UTC+4), это пересекается с европейским рабочим днём. Учусь по специальности «Информационные технологии» в UNEC.',
        },
        seoTitle: {
            en: 'Mehdi Safarzade: Full-Stack Web Developer & AI Engineer',
            az: 'Mehdi Səfərzadə: Full-Stack Veb Developer və AI Mühəndisi',
            ru: 'Мехди Сафарзаде: full-stack веб-разработчик и AI-инженер',
        },
        seoDescription: {
            en: 'I build whole web products with TypeScript, Next.js and NestJS, and AI systems with RAG and multiple agents.',
            az: 'TypeScript, Next.js və NestJS ilə bütöv veb məhsullar, RAG və çoxagentli AI sistemləri qururam.',
            ru: 'Делаю веб-продукты целиком на TypeScript, Next.js и NestJS, а также AI-системы с RAG и несколькими агентами.',
        },
    } satisfies Record<string, L>,
};

export const SKILLS: { key: string; name: string; category: SkillCategory; featured?: boolean }[] = [
    { key: 'typescript', name: 'TypeScript', category: 'LANGUAGE', featured: true },
    { key: 'javascript', name: 'JavaScript', category: 'LANGUAGE' },
    { key: 'python', name: 'Python', category: 'LANGUAGE', featured: true },
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
    { key: 'redux', name: 'Redux', category: 'FRAMEWORK' },
    { key: 'mapbox', name: 'Mapbox GL', category: 'FRAMEWORK' },
    { key: 'd3', name: 'D3', category: 'FRAMEWORK' },
    { key: 'gsap', name: 'GSAP', category: 'FRAMEWORK' },
    { key: 'stripe', name: 'Stripe', category: 'TOOLING' },
    { key: 'kubernetes', name: 'Kubernetes', category: 'CLOUD_DEVOPS' },
    // S-17 (2026-10-08): Java / Spring Boot stay off until used in a real project.
    { key: 'rag', name: 'RAG', category: 'AI', featured: true },
    { key: 'ai-agents', name: 'AI agent development', category: 'AI', featured: true },
    { key: 'google-adk', name: 'Google ADK', category: 'AI' },
    { key: 'n8n', name: 'n8n', category: 'AI' },
];

type ExperienceSeed = {
    key: string;
    org: string;
    orgUrl?: string;
    location?: string;
    startedAt: string;
    endedAt?: string;
    title: L;
    summary: L;
    bullets: L;
};

export const EXPERIENCE: ExperienceSeed[] = [
    {
        key: 'prodata',
        org: 'Prodata MMC',
        startedAt: '2026-07-01',
        title: { en: 'AI and Data Engineer', az: 'AI və Data Mühəndisi', ru: 'AI- и дата-инженер' },
        summary: {
            en: 'An AI assistant that answers agricultural questions, grounded in domain documents and live data.',
            az: 'Sahə sənədlərinə və canlı məlumatlara əsaslanaraq kənd təsərrüfatı suallarına cavab verən AI assistent.',
            ru: 'AI-ассистент, который отвечает на вопросы о сельском хозяйстве на основе отраслевых документов и живых данных.',
        },
        bullets: {
            en: '- Developed and maintain an AI chatbot for agricultural question-answering.\n- Built a RAG pipeline that grounds answers in domain documents and live data.\n- Orchestrated several specialist AI agents behind one conversational interface.\n- Integrated it with company data sources and improved its reliability and answer accuracy.',
            az: '- Kənd təsərrüfatı sualları üçün AI çatbotu hazırladım və onu dəstəkləyirəm.\n- Cavabları sahə sənədlərinə və canlı məlumatlara əsaslandıran RAG pipeline qurdum.\n- Bir söhbət interfeysinin arxasında bir neçə ixtisaslaşmış AI agentini orkestrləşdirdim.\n- Sistemi şirkətin məlumat mənbələri ilə inteqrasiya etdim, etibarlılığını və cavabların dəqiqliyini artırdım.',
            ru: '- Разработал и поддерживаю AI-чатбот для ответов на вопросы о сельском хозяйстве.\n- Построил RAG-пайплайн, который опирает ответы на отраслевые документы и живые данные.\n- Организовал работу нескольких специализированных AI-агентов за одним диалоговым интерфейсом.\n- Интегрировал систему с источниками данных компании, повысил её надёжность и точность ответов.',
        },
    },
    {
        key: 'heroic-art',
        org: 'Heroic.art',
        orgUrl: 'https://heroic.art/about/',
        location: 'Remote',
        startedAt: '2025-03-01',
        endedAt: '2026-05-31',
        title: {
            en: 'Lead Full-Stack Developer',
            az: 'Aparıcı Full-Stack Developer',
            ru: 'Ведущий full-stack разработчик',
        },
        summary: {
            en: "The agency's only developer, responsible for the full product lifecycle; the owner handled QA and planning.",
            az: 'Agentliyin yeganə developeri, məhsulun bütün həyat dövrünə cavabdeh; QA və planlamanı sahibkar aparırdı.',
            ru: 'Единственный разработчик агентства, отвечал за весь жизненный цикл продукта; QA и планирование вёл владелец.',
        },
        bullets: {
            en: "- Built most of the agency's client work: Next.js and Vue 3 frontends, Node.js and Express backends, PostgreSQL.\n- Ran AWS infrastructure (S3, EC2) for hosting, storage and deployment.\n- Worked directly with clients to turn requirements into technical roadmaps.\n- Main developer of Fallout, an interactive map of US nuclear tests, and helped ship Podspun (Stripe payments, fixes, UI).",
            az: '- Agentliyin müştəri işlərinin çoxunu qurdum: Next.js və Vue 3 frontend-ləri, Node.js və Express backend-ləri, PostgreSQL.\n- Hostinq, saxlama və yerləşdirmə üçün AWS infrastrukturunu (S3, EC2) idarə etdim.\n- Tələbləri texniki yol xəritələrinə çevirmək üçün birbaşa müştərilərlə işlədim.\n- ABŞ nüvə sınaqlarının interaktiv xəritəsi olan Fallout-un əsas developeri oldum və Podspun-un buraxılışına kömək etdim (Stripe ödənişləri, düzəlişlər, UI).',
            ru: '- Сделал большую часть клиентских проектов агентства: фронтенды на Next.js и Vue 3, бэкенды на Node.js и Express, PostgreSQL.\n- Вёл инфраструктуру AWS (S3, EC2) для хостинга, хранения и деплоя.\n- Работал напрямую с клиентами, превращая требования в технический план.\n- Был основным разработчиком Fallout, интерактивной карты ядерных испытаний США, и помог запустить Podspun (платежи Stripe, исправления, UI).',
        },
    },
    {
        key: 'self-employed-upwork',
        org: 'Upwork (freelance)',
        orgUrl: 'https://www.upwork.com/freelancers/mehdisafarzade',
        location: 'Remote',
        startedAt: '2024-09-01',
        endedAt: '2026-07-31',
        title: { en: 'Full-Stack Developer', az: 'Full-Stack Developer', ru: 'Full-stack разработчик' },
        summary: {
            en: 'Freelance work for international clients: 10 contracts, about 600 hours, 100% Job Success Score. Earned Top Rated status.',
            az: 'Beynəlxalq müştərilər üçün frilans iş: 10 müqavilə, təxminən 600 saat, 100% Job Success Score. Top Rated statusu qazandım.',
            ru: 'Фриланс для международных клиентов: 10 контрактов, около 600 часов, 100% Job Success Score. Получил статус Top Rated.',
        },
        bullets: {
            en: '- Repeat clients: a Swiss client hired me four times, and an agency owner brought me into their agency after a small first job.\n- Discord authentication integration, a long-running contract (Sep 2024 – Apr 2025).\n- A smart-home check-in system on AWS: Lambda, a React UI, Google Sheets and Hostex integration (three extensions).\n- Dockerised a Node.js app on AWS, built a Discord reminder bot on AWS, a YouTube channel export script, and TypeScript/Node bug fixing.',
            az: '- Təkrar müştərilər: İsveçrədən bir müştəri məni dörd dəfə işə götürdü, bir agentlik sahibi isə ilk kiçik işdən sonra məni agentliyinə cəlb etdi.\n- Discord autentifikasiya inteqrasiyası, uzunmüddətli müqavilə (sentyabr 2024 – aprel 2025).\n- AWS üzərində ağıllı ev üçün check-in sistemi: Lambda, React interfeysi, Google Sheets və Hostex inteqrasiyası (üç uzadılma).\n- AWS-də Node.js tətbiqinin Docker-ə keçirilməsi, AWS-də Discord xatırlatma botu, YouTube kanalının ixrac skripti və TypeScript/Node xətalarının düzəldilməsi.',
            ru: '- Постоянные клиенты: клиент из Швейцарии нанимал меня четыре раза, а владелец агентства после первой небольшой задачи взял меня в своё агентство.\n- Интеграция авторизации через Discord, долгосрочный контракт (сентябрь 2024 – апрель 2025).\n- Система check-in для умного дома на AWS: Lambda, интерфейс на React, интеграция с Google Sheets и Hostex (три продления).\n- Перенос Node.js-приложения в Docker на AWS, Discord-бот напоминаний на AWS, скрипт экспорта YouTube-канала и исправление ошибок в TypeScript/Node.',
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
            en: "Worked on an agency's production codebase as part of a remote team while studying full-time.",
            az: 'Əyani təhsil alarkən uzaqdan işləyən komandanın üzvü kimi agentliyin istehsal kod bazası üzərində işlədim.',
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
        slug: 'fallout-nuclear-test-map',
        status: 'PUBLISHED',
        featured: true,
        order: 1,
        startedAt: '2025-04-01',
        skills: ['react', 'typescript', 'mapbox', 'd3', 'gsap', 'redux'],
        // No screenshots until the owner confirms permission (agency client project).
        title: same('Fallout'),
        role: {
            en: 'Main developer (agency client project, Heroic.art)',
            az: 'Əsas developer (agentlik müştərisinin layihəsi, Heroic.art)',
            ru: 'Основной разработчик (клиентский проект агентства Heroic.art)',
        },
        summary: {
            en: 'An interactive map of every US nuclear test from 1945 to 1992, with fallout deposition across the country.',
            az: '1945–1992-ci illərdə ABŞ-da keçirilmiş bütün nüvə sınaqlarının və ölkə üzrə radioaktiv çöküntülərin interaktiv xəritəsi.',
            ru: 'Интерактивная карта всех ядерных испытаний США с 1945 по 1992 год и радиоактивных выпадений по всей стране.',
        },
        caseStudy: {
            en: "## The problem\n\nA client of the agency wanted the public to see the full history of US nuclear testing, and where its fallout landed, on one map anyone can explore.\n\n## What I built\n\nI joined in April 2025 and was the main developer from then on, writing about three quarters of the project's commits. I rebuilt the map page, the test list, the individual test pages and the content pages, and made all of them work on phones and tablets. I connected the site to the client's CMS and added a glossary and FAQ search, test videos with a custom scrubber, and a total-deposition view.\n\n## The hard parts\n\n- **Map performance.** Deposition data comes as vector tiles from the client's API and is drawn as many Mapbox GL layers: states, counties, tribal lands, cities and borders. I reworked how layers and filters update so moving through decades stays smooth.\n- **Animation.** Tests play back over time with GSAP, with a timeline slider, autoplay and zoom behaviour tuned for each kind of area.\n- **Data.** Values range across many orders of magnitude, so legends use D3 scales with scientific notation, and units switch to what US readers expect.\n\n## Stack\n\nReact, TypeScript, Redux, Mapbox GL, D3, GSAP, SCSS. The original deployment is offline now.",
            az: '## Problem\n\nAgentliyin müştərisi ABŞ nüvə sınaqlarının bütün tarixçəsini və radioaktiv çöküntülərin hara düşdüyünü hər kəsin araşdıra biləcəyi bir xəritədə göstərmək istəyirdi.\n\n## Nə qurdum\n\n2025-ci ilin aprelində qoşuldum və o vaxtdan əsas developer oldum, layihənin commit-lərinin təxminən dörddə üçünü yazdım. Xəritə səhifəsini, sınaqlar siyahısını, ayrı-ayrı sınaq səhifələrini və məzmun səhifələrini yenidən qurdum və hamısını telefon və planşetlərdə işlək etdim. Saytı müştərinin CMS-inə qoşdum, lüğət və FAQ axtarışı, xüsusi oynatma zolağı olan sınaq videoları və ümumi çöküntü görünüşü əlavə etdim.\n\n## Çətin hissələr\n\n- **Xəritənin performansı.** Çöküntü məlumatları müştərinin API-sindən vektor tile-lar kimi gəlir və çoxlu Mapbox GL qatı ilə çəkilir: ştatlar, qraflıqlar, yerli xalqların torpaqları, şəhərlər və sərhədlər. Onilliklər arasında keçid rəvan qalsın deyə qatların və filtrlərin yenilənməsini yenidən qurdum.\n- **Animasiya.** Sınaqlar GSAP ilə zaman üzrə oynadılır: zaman xətti sürgüsü, avtomatik oynatma və hər ərazi növü üçün tənzimlənmiş miqyaslama.\n- **Məlumatlar.** Dəyərlər çox geniş diapazonda dəyişir, ona görə əfsanələr D3 şkalaları və elmi yazılışdan istifadə edir, ölçü vahidləri isə ABŞ oxucularının gözlədiyi formaya keçir.\n\n## Texnologiyalar\n\nReact, TypeScript, Redux, Mapbox GL, D3, GSAP, SCSS. İlkin yerləşdirmə hazırda oflayndır.',
            ru: '## Задача\n\nКлиент агентства хотел показать всю историю ядерных испытаний США и то, куда легли их радиоактивные выпадения, на одной карте, которую может изучить любой.\n\n## Что я сделал\n\nЯ присоединился в апреле 2025 года и с тех пор был основным разработчиком: на мне около трёх четвертей коммитов проекта. Я переделал страницу карты, список испытаний, страницы отдельных испытаний и контентные страницы и адаптировал их под телефоны и планшеты. Подключил сайт к CMS клиента, добавил поиск по глоссарию и FAQ, видео испытаний с собственным скраббером и карту суммарных выпадений.\n\n## Сложные места\n\n- **Производительность карты.** Данные о выпадениях приходят векторными тайлами из API клиента и рисуются множеством слоёв Mapbox GL: штаты, округа, земли коренных народов, города и границы. Я переработал обновление слоёв и фильтров, чтобы переход между десятилетиями оставался плавным.\n- **Анимация.** Испытания проигрываются во времени на GSAP: ползунок шкалы времени, автовоспроизведение и поведение зума, настроенное для каждого типа территории.\n- **Данные.** Значения отличаются на много порядков, поэтому легенды строятся на шкалах D3 с научной записью, а единицы измерения переводятся в привычные для американских читателей.\n\n## Стек\n\nReact, TypeScript, Redux, Mapbox GL, D3, GSAP, SCSS. Исходный деплой сейчас отключён.',
        },
    },
    {
        slug: 'podspun',
        status: 'PUBLISHED',
        order: 2,
        liveUrl: 'https://podspun.com',
        skills: ['stripe'],
        title: same('Podspun'),
        role: {
            en: 'Contributing developer (agency client project, Heroic.art)',
            az: 'Töhfə verən developer (agentlik müştərisinin layihəsi, Heroic.art)',
            ru: 'Разработчик в команде (клиентский проект агентства Heroic.art)',
        },
        summary: {
            en: 'A website builder for podcasters and creators. I joined before launch and helped get it shipped: Stripe payments, bug fixes, code quality and UI work.',
            az: 'Podkastçılar və kreatorlar üçün sayt konstruktoru. Buraxılışdan əvvəl qoşuldum və onun işə düşməsinə kömək etdim: Stripe ödənişləri, xəta düzəlişləri, kod keyfiyyəti və UI işləri.',
            ru: 'Конструктор сайтов для подкастеров и авторов. Я подключился до запуска и помог его выпустить: платежи Stripe, исправление ошибок, качество кода и работа над UI.',
        },
    },
    {
        slug: 'smart-home-check-in',
        status: 'PUBLISHED',
        order: 3,
        skills: ['aws', 'nodejs', 'react'],
        title: {
            en: 'Smart-home check-in system',
            az: 'Ağıllı ev üçün check-in sistemi',
            ru: 'Система check-in для умного дома',
        },
        role: {
            en: 'Freelance, for a Swiss client (Upwork)',
            az: 'Frilans, İsveçrəli müştəri üçün (Upwork)',
            ru: 'Фриланс, для клиента из Швейцарии (Upwork)',
        },
        summary: {
            en: 'A guest check-in and home automation system on AWS: Node.js on Lambda, a React UI, and Google Sheets and Hostex integration. The client hired me four times.',
            az: 'AWS üzərində qonaq check-in və ev avtomatlaşdırma sistemi: Lambda-da Node.js, React interfeysi, Google Sheets və Hostex inteqrasiyası. Müştəri məni dörd dəfə işə götürdü.',
            ru: 'Система заселения гостей и автоматизации дома на AWS: Node.js на Lambda, интерфейс на React, интеграция с Google Sheets и Hostex. Клиент нанимал меня четыре раза.',
        },
    },
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
        order: 4,
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
        order: 5,
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
        order: 6,
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
        order: 7,
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
        order: 8,
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
        order: 9,
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

type TestimonialSeed = {
    key: string;
    /** VERBATIM from the source; only "…" trims allowed. Never reword. */
    quote: string;
    authorName?: string;
    source: 'UPWORK' | 'LINKEDIN';
    /** as shown by the source; omitted when unknown (never guessed) */
    period?: string;
    url?: string;
    authorLabel: L;
    /** az/ru translations; the site labels them as translations of the English original. */
    translation: { az: string; ru: string };
};

export const TESTIMONIALS: TestimonialSeed[] = [
    {
        key: 'upwork-agency-owner',
        source: 'UPWORK',
        period: '2025',
        quote: "Mehdi is one of the best developers I've ever worked with. I run an agency. Have worked with a lot of people. … He's not just skilled and quick to learn, but his attitude is great, has frequent communication, and also bringing a human element to the requests (instead of someone that just executes and doesn't think about the bigger picture). He deserves 6 stars in all categories - 5 too small.",
        authorLabel: { en: 'Agency owner', az: 'Agentlik sahibi', ru: 'Владелец агентства' },
        translation: {
            az: 'Mehdi indiyədək birgə işlədiyim ən yaxşı developerlərdən biridir. Agentlik idarə edirəm. Çox insanla işləmişəm. … O, təkcə bacarıqlı və tez öyrənən deyil, həm də münasibəti əladır, tez-tez ünsiyyət saxlayır və tapşırıqlara insani yanaşma gətirir (sadəcə icra edib böyük mənzərəni düşünməyən biri kimi deyil). Bütün kateqoriyalarda 6 ulduza layiqdir - 5 azdır.',
            ru: 'Мехди — один из лучших разработчиков, с которыми я когда-либо работал. У меня агентство. Я работал с очень многими людьми. … Он не только опытный и быстро учится, но и отлично настроен, часто выходит на связь и привносит в задачи человеческий подход (а не просто исполняет, не думая о картине в целом). Он заслуживает 6 звёзд во всех категориях - 5 слишком мало.',
        },
    },
    {
        key: 'upwork-swiss-client',
        source: 'UPWORK',
        period: '2024',
        quote: 'Mehdi went above and beyond my expectations, when he designed a NodeJS Backend and React Frontend for a home automation UI including AWS hosting and AWS Lambda! I highly recommend Mehdi to anyone for any classical software engineering & hyperscaler tasks…',
        authorLabel: { en: 'Client, Switzerland', az: 'Müştəri, İsveçrə', ru: 'Клиент, Швейцария' },
        translation: {
            az: 'Mehdi ev avtomatlaşdırma interfeysi üçün NodeJS backend və React frontend, o cümlədən AWS hostinqi və AWS Lambda layihələndirəndə gözləntilərimi çox aşdı! Mehdini istənilən klassik proqram mühəndisliyi və hiperskeyler tapşırıqları üçün hər kəsə yüksək tövsiyə edirəm…',
            ru: 'Мехди превзошёл все мои ожидания, когда спроектировал бэкенд на NodeJS и фронтенд на React для интерфейса умного дома, включая хостинг на AWS и AWS Lambda! Горячо рекомендую Мехди всем для любых задач классической разработки ПО и работы с гиперскейлерами…',
        },
    },
    {
        key: 'upwork-client-communicator',
        source: 'UPWORK',
        period: '2024–2025',
        quote: 'Great communicator and very responsive. Consistently delivers high quality work, on time, and with good attention to detail. Mehdi provided lots of useful advice and recommendation in areas where he had lots of expertise… Mehdi is also a fast learner and quickly acquired new skills that were needed to complete the project.',
        authorLabel: { en: 'Client', az: 'Müştəri', ru: 'Клиент' },
        translation: {
            az: 'Əla ünsiyyət qurur və çox tez cavab verir. Ardıcıl olaraq yüksək keyfiyyətli işi vaxtında və detallara diqqətlə təhvil verir. Mehdi böyük təcrübəsi olan sahələrdə çoxlu faydalı məsləhət və tövsiyələr verdi… Mehdi həm də tez öyrənir və layihəni tamamlamaq üçün lazım olan yeni bacarıqlara tez yiyələndi.',
            ru: 'Отлично общается и очень быстро отвечает. Стабильно сдаёт качественную работу вовремя и с хорошим вниманием к деталям. Мехди дал много полезных советов и рекомендаций в областях, где у него большой опыт… Мехди также быстро учится и быстро освоил новые навыки, которые понадобились для завершения проекта.',
        },
    },
    {
        key: 'upwork-client-human',
        source: 'UPWORK',
        period: '2024',
        quote: "He's smart, great attitude, creative, highly capable. In a world of Upwork bots, he's 100% human but also better than a bot.",
        authorLabel: { en: 'Client', az: 'Müştəri', ru: 'Клиент' },
        translation: {
            az: 'O, ağıllıdır, münasibəti əladır, yaradıcıdır, çox bacarıqlıdır. Upwork botları dünyasında o, 100% insandır, amma həm də botdan yaxşıdır.',
            ru: 'Он умный, с отличным настроем, креативный, очень способный. В мире Upwork-ботов он на 100% человек, но при этом лучше бота.',
        },
    },
    {
        key: 'linkedin-mark-bosshard',
        source: 'LINKEDIN',
        authorName: 'Mark Bosshard',
        url: 'https://www.linkedin.com/in/mehdi-safarzade',
        quote: 'Mehdi supported me in multiple projects for Switzerland-based businesses. I was absolutely thrilled by how fast he grasped the business requirements, but also how flexibly he was able to apply them to my choice of technology (AWS, NodeJS, ...). He always met the deadlines and did a very proactive planning to ensure his availability - plus his communication skill made everything going extremely smooth. I would highly recommend Mehdi for Software / App development projects to anyone!',
        authorLabel: { en: 'CEO of StrategicAI', az: 'StrategicAI-ın CEO-su', ru: 'CEO StrategicAI' },
        translation: {
            az: 'Mehdi İsveçrədə yerləşən bizneslər üçün bir neçə layihədə mənə dəstək oldu. Biznes tələblərini nə qədər tez qavradığı, həm də onları seçdiyim texnologiyalara (AWS, NodeJS, ...) nə qədər çevik tətbiq edə bildiyi məni çox sevindirdi. O, həmişə müddətlərə əməl edirdi və əlçatan olmasını təmin etmək üçün çox proaktiv planlama aparırdı - üstəlik ünsiyyət bacarığı hər şeyin son dərəcə rəvan getməsini təmin etdi. Mehdini proqram təminatı / tətbiq hazırlanması layihələri üçün hər kəsə yüksək tövsiyə edərdim!',
            ru: 'Мехди помогал мне в нескольких проектах для швейцарских компаний. Я был в восторге от того, как быстро он вникал в бизнес-требования и как гибко применял их к выбранным мной технологиям (AWS, NodeJS, ...). Он всегда укладывался в сроки и очень проактивно планировал, чтобы быть доступным, - а его умение общаться делало всё исключительно гладким. Я бы горячо рекомендовал Мехди всем для проектов по разработке ПО и приложений!',
        },
    },
];
