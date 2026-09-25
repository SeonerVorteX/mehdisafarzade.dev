# SEED_REVIEW.md

Content that goes into the seed but is **not confirmed as current**. Each item is seeded with `needsReview: true` and appears on the admin dashboard until it's cleared in the CMS. Items marked **DRAFT** are seeded unpublished and never shown on the public site until you publish them.

Sources:
- **GH**: GitHub `origin/main` @ `b2adc49` (2026-06-18): `src/data/data.ts`, `public/documents/Resume.pdf` (2026 résumé).
- **OLD**: legacy history (`fb7e394`): the 9-project `data.ts`. The Dec 2024 résumé is **not** used (decision 2026-09-25).
- **ANS**: your Phase 0 answers.

Status key: ☐ open · ✔ resolved (with date + decision)

## Blocking (needs your input before Phase 6 goes live)

| ID | Item | Seeded value | Why it needs review |
|---|---|---|---|
| S-01 | Upwork profile URL | `<UPWORK_PROFILE_URL>` placeholder; the link is hidden while it's a placeholder | ANS: "I'll fill this in" |
| S-02 | LinkedIn URL | `https://www.linkedin.com/in/mehdi-safarzade` | ✔ 2026-09-25: confirmed (GH value; the old answer was out of date) |
| S-03 | Bio / age | GH: "I'm a 19-year-old full-stack developer from Baku … professionally since 2021 … studying IT at UNEC" | Ages go stale. Proposal: drop the age and keep "since 2021". Needs az + ru translations. |
| S-04 | Headline / pitch | Derived from the GH résumé summary: "Full-Stack Developer — TypeScript, Next.js & NestJS. I design, build and run production platforms end to end." | Newly written copy. Please confirm the tone (en), then az/ru. |
| S-05 | "Available for work" flag | `true` | Is it currently true? It controls the hero badge. |

## Profile & experience (source: GH 2026 résumé, per decision 2026-09-25)

| ID | Item | Seeded value | Why |
|---|---|---|---|
| S-10 | English résumé PDF | the GH 2026 `Resume.pdf` (en only; az/ru hidden until uploaded) | ✔ 2026-09-25: use the 2026 PDF, drop Dec 2024. Still `needsReview`, because the PDF says "4+ years" and "Currently expanding into Java", which will go stale. |
| S-11 | Heroic.art | Lead Full-Stack Developer, Mar 2025 – present, remote, heroic.art. Next.js + Vue 3 / Node + Express / PostgreSQL / AWS S3+EC2 | Still current? Is the client OK with being named publicly? |
| S-12 | Self-employed (Upwork) | Full-Stack Developer, Aug 2024 – Mar 2025, "Top Rated, 100% JSS" (2026 résumé) | ☐ Top Rated / 100% JSS are live Upwork metrics. Still true? Do you want to keep freelancing listed as ended in Mar 2025 while the Upwork link (S-01) is on the site? |
| S-13 | Mobius | Full-Stack Developer, Oct 2024 – Dec 2024, remote, mobius.az | Dates confirmed in both résumés. OK to name? |
| S-14 | BakuDevsGroup | Backend Developer, Sep 2021 – Jan 2022 | ✔ 2026-09-25: 2026 résumé is authoritative |
| S-15 | Education | UNEC, B.Sc. Information Technology, 2023 – 2027 (in progress) | Expected graduation year. |
| S-16 | Languages (spoken) | Azerbaijani (native), Turkish (native), English | ☐ The 2026 résumé has no languages section. The old one said English "fluent" / Russian "basics", and the GH site data says "B2 English". Which level, and should Russian be listed at all? |
| S-17 | Skills list | From GH résumé: TypeScript, JavaScript, Python, Java (beginner); Next.js, React, NestJS, Express, Node.js, Spring Boot (beginner); PostgreSQL, MongoDB, Prisma; AWS (S3, EC2, SES, Lambda, DynamoDB, Amplify), Docker, Nginx, Linux, Git, CI/CD; RabbitMQ; SCSS, Tailwind; Zod, RHF, Yarn Berry, Turborepo | Show the "beginner" items publicly, or keep them private? Levels are seeded as null (no bars), since skill-level bars read poorly. |

## Projects

| ID | Item | Seeded as | Why |
|---|---|---|---|
| S-20 | **Examination.az** (flagship) | PUBLISHED, featured, `needsReview`. Case study from **public info only**: university exam-prep platform for Azerbaijani students; Next.js monorepo (Turborepo) with landing/app/admin; NestJS + PostgreSQL/Prisma; RabbitMQ for async processing; self-managed VPS behind nginx + Cloudflare; az/en/ru/tr. Links: https://www.examination.az | Your review for accuracy and what you're comfortable disclosing. **Nothing from `AUDIT.md`/`ROADMAP.md`/`PAYMENT.md`.** No user counts or revenue unless you give them. Screenshot: the GH `Examination.png` (533 KB). Replace it with a current capture? |
| S-21 | Old UNEC "Examination System" (unec-examination.vercel.app, github.com/SeonerVorteX/examiner) | **not seeded** | ANS 9: replaced by S-20. |
| S-22 | Personal Portfolio (this site) | DRAFT | OLD tags said Express/MongoDB (wrong). Re-describe it as v2 when it launches. |
| S-23 | Project Updater (npm `project-updater`) | DRAFT | OLD. Still maintained? |
| S-24 | Discord Moderation Bot | DRAFT | OLD. Merge with S-25 into one "Discord bots" project? |
| S-25 | Discord Registration Bot | DRAFT | OLD |
| S-26 | AI Voice Assistant ("charlie-ai-assistant", Python/TensorFlow) | DRAFT | OLD. Worth showing? |
| S-27 | Live Chat Application (console-live-chat, Socket.io) | DRAFT | OLD |
| S-28 | Simple RESTful API | **not seeded** | ANS 7: dropped |
| S-29 | Todo Application | **not seeded** | ANS 7: dropped |
| S-30 | Project images from `opengraph.githubassets.com` | not seeded; projects S-22…S-27 have no cover | External hot-linked OG images are replaced by uploads to the media library. |

## Dropped (ANS 7), recorded for completeness

- Discord invite `https://discord.gg/MTNkXHnX3b`: not seeded.
- Typed-text hero (`typingTexts`) and `typed.js`: not ported.
- "Web3 / blockchain / smart contracts" wording (OLD about text): not seeded.
- "Young, talented software student…" hero line (OLD): not seeded.
- `Illustration.svg` hero art, `404.svg`: not reused (new design). Kept in `legacy/` until Phase 10.
- `Favicon.png` (542 B): replaced by the new brand mark in Phase 5.

## Sample content

| ID | Item | Seeded as |
|---|---|---|
| S-40 | Sample post "Hello, v2" in az/en/ru | DRAFT, clearly labeled as sample text. Delete or rewrite before launch. |
| S-41 | `/uses` page | DRAFT, empty skeleton. Fill it in or leave it unpublished. |
