import type { Language } from '@/types/types';

const languages: Language[] = [
    { name: 'TypeScript', level: 'advanced' },
    { name: 'Next.js & React', level: 'advanced' },
    { name: 'NestJS', level: 'advanced' },
    { name: 'Node.js & Express', level: 'advanced' },
    { name: 'Python', level: 'regular' },
];

export default {
    technologies: {
        languages,
        tools: ['PostgreSQL', 'MongoDB', 'Prisma ORM', 'RabbitMQ', 'Docker', 'Nginx', 'Git', 'Turborepo'],
        cloud: ['AWS S3', 'AWS EC2', 'AWS SES', 'AWS Lambda', 'AWS DynamoDB', 'AWS Amplify'],
        experiences: [
            'Full-Stack Web Development',
            'RESTful API Design',
            'System Architecture',
            'Cloud Deployment',
            'Linux Server Management',
            'Bot Development',
            'Code Review',
        ],
        skills: ['Teamwork', 'B2 English', 'Azerbaijani (Native)', 'Turkish (Native)'],
    },
    projects: [
        {
            id: 1,
            title: 'Examination.az',
            description: 'A full-stack platform for Azerbaijani university entrance exam preparation.',
            image: {
                src: '/images/Examination.png',
                alt: 'Examination.az',
            },
            preview: 'https://www.examination.az',
            url: 'https://www.examination.az',
            tags: ['Next.js', 'NestJS', 'TypeScript', 'PostgreSQL', 'Prisma', 'RabbitMQ', 'Turborepo'],
        },
    ],
    about: {
        description:
            "I'm a 19-year-old full-stack developer from Baku, Azerbaijan, passionate about building scalable web applications. I started programming at 15, writing JavaScript for fun, and have been working professionally since 2021. I'm currently studying Information Technology at UNEC while freelancing and building my own projects.",
        skills: 'I specialise in TypeScript-first full-stack development using Next.js and NestJS. I build and deploy production applications — from system architecture and API design to cloud infrastructure on AWS and self-managed Linux servers.',
        expectations:
            "I'm looking for full-stack or backend developer roles where I can work on meaningful products, take real ownership, and keep growing. I value clean code, good architecture, and teams that care about what they build.",
        email: 'contact@mehdisafarzade.dev',
        socials: {
            linkedin: 'https://linkedin.com/in/mehdi-safarzade',
            github: 'https://github.com/SeonerVorteX',
            discord: 'https://discord.gg/MTNkXHnX3b',
        },
    },
    typingTexts: ['Full-Stack Developer', 'Next.js & NestJS', 'TypeScript'],
};
