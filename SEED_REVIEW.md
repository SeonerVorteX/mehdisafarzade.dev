# SEED_REVIEW.md

Content that goes into the seed but is **not confirmed as current**. Each item is seeded with `needsReview: true` and appears on the admin dashboard until it's cleared in the CMS. Items marked **DRAFT** are seeded unpublished and never shown on the public site until you publish them.

Sources, newest first (a newer source wins where they differ):
- **CV26**: your 2026 CV, `api/prisma/seed-assets/resume-without-phone.pdf`, plus `PRODUCT_UPDATE_PROMPT.md` (2026-10-08). Where the two differ, the prompt wins, since it's newer and more exact.
- **GH**: GitHub `origin/main` @ `b2adc49` (2026-06-18): `src/data/data.ts`, the older 2026 résumé (removed from the seed 2026-10-08).
- **OLD**: legacy history (`fb7e394`): the 9-project `data.ts`.
- **ANS**: your Phase 0 answers.

Status key: ☐ open · ✔ resolved (with date + decision)

## Profile (needs your input before Phase 6 goes live)

| ID | Item | Seeded value | Why it needs review |
|---|---|---|---|
| S-01 | Upwork profile URL | `https://www.upwork.com/freelancers/mehdisafarzade` | ✔ 2026-10-08 (CV26) |
| S-02 | LinkedIn URL | `https://www.linkedin.com/in/mehdi-safarzade` | ✔ 2026-09-25 |
| S-03 | Bio | First person, no age, "since 2021", Prodata, the remote-team line, Azerbaijani (native) + English B2+, Baku UTC+4, UNEC | ☐ Rewritten from CV26. You proofread az later (non-blocking for design). |
| S-04 | Headline / pitch | "Full-Stack Web Developer & AI Engineer". Pitch: "I build whole web products on my own, from the data model and API to the interface and the server it runs on. Lately I also build AI systems: RAG pipelines and multi-agent assistants in production." | ☐ New copy. You proofread az later (non-blocking for design). |
| S-05 | Availability | Two admin flags (2026-10-08): `availableForFreelance` = on, `availableForRoles` = on, each shown subtly only while on | ✔ 2026-10-08. The flags are yours to toggle in the admin. |
| S-10 | Résumé PDF | CV26 `resume-without-phone.pdf` (en only), re-exported 2026-10-08 without your phone number or any reference email, Top Rated in the past tense | ✔ 2026-10-08. The only résumé in the seed; az/ru and later updates go through the admin (S3). |

## Profile & experience

| ID | Item | Seeded value | Why |
|---|---|---|---|
| S-11 | Heroic.art | Lead Full-Stack Developer, Mar 2025 – May 2026. "The agency's only developer, responsible for the full product lifecycle; the owner handled QA and planning." Org link: heroic.art/about/ (team page). Mentions Fallout and Podspun. | ✔ 2026-10-08 (prompt §2) |
| S-12 | Upwork (freelance) | Sep 2024 – Jul 2026 (ended). "10 contracts, about 600 hours, 100% Job Success Score. Earned Top Rated status." Repeat clients + notable contracts in the bullets | ✔ 2026-10-08. ☐ "$10K+ earned" was left as a `<yes \| no>` placeholder, so it stays **hidden** until you say yes. The freelance availability flag is independent. |
| S-13 | Mobius | Full-Stack Developer, Oct – Dec 2024, remote agency team, React/Node/Express/MongoDB | ✔ 2026-10-08 (prompt §5) |
| S-14 | BakuDevsGroup | Backend Developer, Sep 2021 – Jan 2022 | ✔ 2026-09-25 |
| S-15 | Education | UNEC, B.Sc. Information Technology, 2023 – 2027 (in progress) | ✔ 2026-10-08 (prompt §5) |
| S-16 | Languages | Azerbaijani (native), English (B2+ / upper-intermediate), in the bio | ✔ 2026-10-08 (prompt §5). Russian and Turkish are not listed. Say if you want them. |
| S-17 | Skills | Added: Python (featured), Google ADK, n8n, AI agent development, RAG (new `AI` category), Kubernetes, Redux, Mapbox GL, D3, GSAP, Stripe | ✔ 2026-10-08: Java / Spring Boot hidden (not seeded) until used in a real project. |
| S-18 | Prodata MMC | AI and Data Engineer, Jul 2026 – present (matches CV26). Named publicly. No location. | ☐ Your answer had `<…>` placeholders. Defaults: **named**, because the public résumé PDF already names Prodata MMC; **location omitted**. Tell me Baku or remote, or ask for the "agri-tech company" wording instead. |

## Projects

| ID | Item | Seeded as | Why |
|---|---|---|---|
| S-20 | **Examination.az** (flagship) | PUBLISHED, featured. Public info only. | ☐ Your review for accuracy. Note: `examination-az.png` is the Examination.az **logo** (glowing shield), not a screenshot. It's used as the project's mark; a real screen capture of the current version is still needed. |
| S-22 | mehdisafarzade.dev (this site) | DRAFT | Re-describe it as v2 when it launches. No mention of the admin gate or security setup ("self-hosted on my own server" only). |
| S-23 … S-27 | Project Updater, two Discord bots, AI Voice Assistant, Live Chat | DRAFT (now ordered after the new projects) | OLD. Still worth showing? |
| S-30 | Old project images (`opengraph.githubassets.com`) | not seeded | Replaced by uploads to the media library. |
| S-31 | **Fallout** (US nuclear test map) | PUBLISHED, featured, **no image**. Case study from the repo history (read-only). | ☐ You review it in the CMS. Screenshots stay off until you confirm permission. |
| S-32 | **Podspun** | PUBLISHED, link to podspun.com. Only your contributions: Stripe payments, bug fixes, code quality, UI work to get it shipped. Skill tag: Stripe only. | ✔ 2026-10-08 (placeholder left, so the stack stays **Stripe only**) |
| S-33 | **Smart-home check-in system** | PUBLISHED, no client name: "for a Swiss client on Upwork", Node.js on Lambda, React UI, Google Sheets + Hostex, hired four times | ☐ New card built from prompt §3 and testimonial 2. OK to show? |

## Testimonials (new 2026-10-08)

Verbatim quotes; checked character for character against `PRODUCT_UPDATE_PROMPT.md`. az/ru carry a translation the site must label as a translation. All five are PUBLISHED with `needsReview`. No email or phone is stored anywhere.

| ID | Author label | Source, period | Open question |
|---|---|---|---|
| S-50 | Agency owner | Upwork, 2025 | ☐ You proofread az later (non-blocking for design). |
| S-51 | Client, Switzerland | Upwork, 2024 | ☐ Same, non-blocking |
| S-52 | Client | Upwork, 2024–2025 | ☐ Same, non-blocking |
| S-53 | Client | Upwork, 2024 | ☐ Same, non-blocking |
| S-54 | **Mark Bosshard**, CEO of StrategicAI | LinkedIn, **no date** | ✔ 2026-10-08 (placeholder left, so the date stays **empty**; never guessed). Named with consent. |

## Dropped, recorded for completeness

- Discord invite `https://discord.gg/MTNkXHnX3b`: not seeded.
- Typed-text hero (`typingTexts`) and `typed.js`: not ported.
- "Web3 / blockchain / smart contracts" wording (OLD about text): not seeded.
- "Young, talented software student…" hero line (OLD): not seeded.
- `Illustration.svg` hero art, `404.svg`: not reused (new design). Kept in `legacy/` until Phase 10.
- `Favicon.png` (542 B): replaced by the new brand mark.
- The older GH 2026 résumé PDF (`resume-en-2026.pdf`): removed; CV26 is the only seeded résumé (2026-10-08).

## Sample content

| ID | Item | Seeded as |
|---|---|---|
| S-40 | Sample post "Hello, v2" in az/en/ru | DRAFT, clearly labeled as sample text. Delete or rewrite before launch. |
| S-41 | `/uses` page | DRAFT, empty skeleton. Fill it in or leave it unpublished. |
