# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **International clients (primary).** Founders, small teams and agencies, often arriving from Upwork or a shared link, deciding whether to hand a whole web product (or an AI feature) to one developer. They scan for proof that Mehdi can own the result, then decide whether to write.
2. **Recruiters and hiring managers (secondary).** They check experience, scope of responsibility and the résumé, usually in English, often on a phone between other tabs. They also need to see that "one person" doesn't mean "can't work in a team".
3. **Local audience (tertiary).** Azerbaijani- and Russian-speaking visitors (clients, peers, students who know Examination.az) reading in az or ru.

Everyone reads in English first except the local audience; az and ru are full translations, not summaries.

## Product Purpose

The personal site of Mehdi Safarzade, a **full-stack web developer and AI engineer** from Baku. Full-stack is the lead; AI is the current focus. The site exists to turn a visitor into a conversation. **Success = the visitor sends a message** (contact form or email) with a project brief or an interview request. Upwork, the résumé PDF, testimonials and the blog are supporting proof, not the goal.

The blog is a first-class section: articles with code are how visitors see how Mehdi thinks.

## Positioning

**Whole product, one person.** Mehdi takes a web product from architecture to running production on his own: data model, API, admin tools, the interface, deployment and operations. Evidence:
- **Examination.az:** built and run end to end.
- **Heroic.art:** the agency's only developer (Mar 2025 – May 2026), building most of its client work; the owner did QA and planning.
- **Prodata:** the AI system he builds now.
- The site itself (Next.js + NestJS), self-hosted on his own server.

**Second strength: AI engineering.** RAG pipelines and multi-agent systems in production (Prodata, Jul 2026 – present: an agricultural question-answering assistant grounded in domain documents and live data).

**For recruiters, one line:** he has also worked inside remote teams (Mobius; Heroic.art with the owner as QA/PM).

Supporting proof, never the lead:
- Upwork: 10 contracts, about 600 hours, 100% Job Success Score, and repeat clients. Top Rated is **past tense only** ("earned Top Rated status", or "Top Rated (2024–2026)"), never presented as current.
- Real testimonials (see Evidence).
- Professional work since 2021.

## Operating Context

- Visitors arrive from Upwork, LinkedIn, GitHub, direct links and search, on desktop and phone.
- Three locales, always URL-prefixed: `/en` (default), `/az`, `/ru`. Content is translated per item in the CMS; a missing translation falls back to English with a visible notice.
- Light and dark themes. **Default is "follow system"**; the visitor can switch. Both themes must be designed in their own right, not one inverted from the other.
- Mehdi is in Baku (UTC+4), which overlaps with European working hours. Client calls are in Azerbaijani (native) or English (B2+ / upper-intermediate).
- Content is managed in the admin CMS: profile, projects, experience, skills, posts, pages, media, **testimonials** (Phase 7), and **two availability flags**: open to freelance projects, and open to full/part-time roles. The owner toggles each from the admin.

## Capabilities and Constraints

- Sections: home, projects (with case studies), blog (tags, search, code blocks), about, contact, a "uses" page, résumé download (per locale, only where a PDF exists).
- Contact form with spam protection; replies come by email.
- **Availability:** each flag is shown **subtly** (near the contact call to action, not as a banner) and only while it is on. The site states only what the flag says; employment context beyond "currently at Prodata" stays private.
- **Testimonials:** quoted **verbatim** in the original English; trimming with "…" is the only edit allowed, never rewording, merging or inventing. az/ru show the original plus a translation clearly labelled as a translation. Each has an author label, source (Upwork / LinkedIn), date when known, optional URL and sort order.
- **Public content never mentions** the admin gate, device enrolment or other security setup. "Self-hosted on my own server" is enough.
- **Never published:** anyone's email address, Mehdi's phone number.
- Built as static/ISR pages; performance budget Lighthouse ≥ 95 on mobile.
- **Fonts (binding):** every display and body face must cover Latin, Azerbaijani (Əə Ğğ Iı İi Şş Çç Öö Üü) and Cyrillic in **one family per role**. No per-locale font swapping. Self-hosted through next/font.

## Brand Commitments

- **Name:** Mehdi Safarzade (az: Mehdi Səfərzadə, ru: Мехди Сафарзаде).
- **Title:** Full-Stack Web Developer & AI Engineer.
- **Voice:** first person, conversational. Plain, concrete, a little personality, like talking to a client. The same voice in az and ru, not literal translations of English idioms.
- **Personality (working words):** precise, warm, confident. Personality comes from colour, typography, layout and small interaction details.
- **References the owner made binding:**
  - *joshwcomeau.com:* the rich, confident, warm colour; the blog-first structure; great article pages (readable width, strong code blocks, sidebar/table of contents); clear sections.
  - *linear.app:* the precision, polish and restraint, subtle depth, excellent typography and spacing.
  - The direction sits on the axis between the two: Linear's precision + Comeau's warmth.
- **Explicitly rejected:**
  - Illustrations, mascots, cartoon characters, rainbow or decorative art (including Comeau's).
  - Anything that reads as a SaaS or product-launch marketing page (Linear's genre).
  - Minimal text-only developer sites (leerob, paco, rauno, emilkowal).
  - The first Phase 5 tile: dark editorial serif with a vermilion or lime accent, mono uppercase eyebrows, giant numbered sections.
- **Human element:** where a direction needs one, use Mehdi's photo (provided later; a placeholder until then), never an illustration.

## Evidence on Hand

- **Profile and experience** in `api/prisma/seed-data.ts`, from the 2026 CV (`api/prisma/seed-assets/resume-without-phone.pdf`); open items in `SEED_REVIEW.md`. Roles: Prodata MMC (AI and Data Engineer, Jul 2026 – present), Heroic.art (Lead Full-Stack Developer, Mar 2025 – May 2026; listed on https://heroic.art/about/, link only, never embed its images), Upwork freelance (Sep 2024 – Jul 2026, ended; the freelance availability flag is independent of it), Mobius (Oct – Dec 2024), BakuDevsGroup (Sep 2021 – Jan 2022). Education: B.Sc. Information Technology, UNEC, 2023 – 2027.
- **Projects:**
  - *Examination.az* (flagship): public information only; screenshot in `api/prisma/seed-assets/`.
  - *Fallout* (an interactive map of every US nuclear test, 1945–1992; agency client project): main developer from Apr 2025, about 147 of the project's 200 commits. The deployment is offline. **No screenshots until permission is confirmed**; use a neutral placeholder.
  - *Podspun* (podspun.com): Mehdi's contributions only (Stripe payments, bug fixes, code quality, UI work to get it shipped), never presented as his product.
  - *Smart-home check-in system:* for a Swiss Upwork client, hired four times (Lambda, React UI, Google Sheets/Hostex).
  - Notable Upwork contracts (no client names): Discord auth integration (Sep 2024 – Apr 2025), Dockerising a Node.js app on AWS, a Discord reminder bot on AWS, a YouTube channel export script, TypeScript/Node bug fixing.
- **Testimonials:** five real, sourced quotes. Four are from Upwork clients (an agency owner, 2025; a Swiss client, 2024; two clients, 2024 and 2024–2025). One is a LinkedIn recommendation from **Mark Bosshard, CEO of StrategicAI**, named with his confirmed consent. All are seeded verbatim.
- **Socials:** GitHub (SeonerVorteX), LinkedIn (mehdi-safarzade), Upwork (https://www.upwork.com/freelancers/mehdisafarzade).
- **Absent, never fabricate:** client logos, user counts, revenue, pricing, a portrait photo (placeholder only), screenshots of client projects without permission, blog posts beyond the development sample, and any testimonial not in the seed.

## Product Principles

1. **One conversation is the goal.** Every page leads, without pressure, to writing to Mehdi.
2. **Show ownership, not a stack list.** Prefer how a whole product was built and run over badges of technologies.
3. **Let other people vouch.** Real client words and repeat hiring are stronger than self-description; quote them exactly.
4. **Reading is part of the pitch.** Articles and case studies must be pleasant to read at length, code included.
5. **Equal in three languages, honest in all.** az and ru get the same quality as English. There are no invented numbers, quotes or claims, and unconfirmed facts wait in SEED_REVIEW.md.

## Accessibility & Inclusion

WCAG 2.2 AA in both themes (enforced by `packages/ui/lib/tokens.test.ts`), visible keyboard focus, reduced motion respected, readable on phones, correct `lang` per locale (English testimonial quotes inside az/ru pages carry `lang="en"`).
