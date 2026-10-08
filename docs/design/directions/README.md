# Phase 5 design directions

Three directions for the site, each a real mini home page built on the same true content: hero with a working message form, a project, an experience snippet, two verbatim testimonials, a blog excerpt with code, the contact form, header and footer. They sit on your Linear ↔ Josh Comeau axis: **A** closest to Linear, **B** in between, **C** closest to Comeau.

- Live (dev only): `/en/_design/directions/a`, `/b`, `/c` (also `/az`, `/ru`). Production builds return 404.
- Screenshots in this folder: `<direction>-<locale>-<theme>-<width>.png`, for en/ru × light/dark × 1440/390. Regenerate with `node apps/web/scripts/design-shots.mjs` from `frontend/` while the dev server runs.
- Every text pair passes WCAG AA in both themes, and every font was checked glyph by glyph for Latin + Azerbaijani (Əə Ğğ Iı İi Şş Çç Öö Üü) + Cyrillic in one family.
- Process: Impeccable concept seed `8c3cf8f7` (persuade mode). Your pinned axis beat the roll, so the seed's challengers were used only to raise each direction (the "Borrowed" lines).

---

## A. Line (closest to Linear)

**Rationale.** PRODUCT.md's lead claim is "whole product, one person". A is that claim drawn literally: a product is one route (data model, API, admin tools, interface, server, in production), and I ride it from the first stop to the last. The hero shows the six stages with Examination.az as the example, and the line ends in your project: the message form. Linear's discipline (quiet ground, one family, hairlines, subtle depth) with one warm signal colour so it doesn't go cold.

| Tokens | Light | Dark |
|---|---|---|
| Ground | Platform `#F3F5FA` | Night `#10162A` |
| Surface | `#FFFFFF` | `#18213B` |
| Ink / muted | `#121A33` / `#525C7A` | `#E7EBF6` / `#9BA5C1` |
| Line (accent) | Ultramarine `#2F4FD8` | `#7D97FF` |
| Signal | Sodium `#F2B544` (text `#8A5A00`) | `#F2B544` |

- **Type:** Geologica for everything. Display 650 weight, −0.04em, with a touch of its "sharpness" axis. Body 400 at 17px.
- **Shape:** 10–16px radii, 1px hairlines, a single soft offset shadow on raised surfaces.
- **Signature:** the route line. It draws across the hero's stages once on load, then runs down the left rail and fills as you scroll (CSS scroll timeline). Section headings are stations on it, and the last station turns amber at the contact form.
- **Borrowed (Versailles challenger):** axial discipline. Everything hangs off one line.
- **Honest risk:** the most familiar of the three. It can read as cool or "product-like", and the route metaphor needs the hero to land it.

## B. Pane (in between)

**Rationale.** Sheki's shebeke windows are assembled from hundreds of exact walnut pieces, with no nails or glue, holding coloured glass. That is precision producing warmth, the exact mix you asked for, and it comes from your own country, quietly signalling Baku to local visitors without a single motif. The rule is strict: the frame is exact, and colour exists only inside the panes. The hero is one window: headline, Examination.az, your current AI role, a verbatim client quote, and the message form, each in its own pane.

| Tokens | Light | Dark |
|---|---|---|
| Wall | Plaster `#ECEEF1` | Walnut `#22180F` |
| Clear glass | `#F8F9FA` | `#2D2117` |
| Frame | Walnut `#3A2A20` | `#0F0A07` |
| Ink / muted | `#1F1916` / `#5C524B` | `#F4EDE6` / `#C0B2A6` |
| Glass | Cobalt `#2350B8`, Ruby `#AE2440`, Emerald `#167A54`, Amber `#E3A21A` | Cobalt `#5B86F2`, Ruby `#EC6A82`, Emerald `#45C58C`, Amber `#F2B53A` |

- **Type:** Commissioner for everything. Its "flair" axis carves wood-cut terminals into headings, and body text stays plain.
- **Shape:** an 8px lattice (6px on phones), 3–6px radii, no shadows. Depth comes from the frame.
- **Signature:** light through glass. The pointer is the light source behind the window and brightens the pane it passes over. On phones the panes stack in reading order, with the form second.
- **Borrowed (Akari challenger):** light is the state.
- **Honest risk:** the boldest identity. The brown dark mode is unusual, and the lattice must stay rectilinear craft, never ornament.

## C. Post (closest to Comeau)

**Rationale.** Success, per PRODUCT.md, is one message, and your clients are international. C treats every proof as correspondence:
- client testimonials are letters received, postmarked with source and year;
- writing is "Dispatches", placed straight after the hero (Comeau's blog-first structure);
- the project is a postcard;
- the contact form is an envelope you address to "Mehdi Safarzade, Baku" with a UTC+4 stamp.

Comeau's rich, confident colour carries it, as whole fields rather than accents.

| Tokens | Light | Dark |
|---|---|---|
| Ground | Onionskin `#E8EEFA` | `#121931` |
| Paper | `#FFFFFF` | `#1C2547` |
| Ink / muted | Fountain navy `#1B2550` / `#4C5780` | `#EEF1FA` / `#AAB4D8` |
| Blue (field / accent) | Par avion `#2348B8` | field `#1F2D72`, accent `#8FA8FF` |
| Rose / marigold | `#C2305E` / `#F2B132` | `#FF86A5` / `#F6C35A` |

- **Type:** Nunito for everything. Display at 900, rounded and warm.
- **Shape:** 10–22px radii and soft shadows on paper. The airmail stripe appears once, on the envelope.
- **Signature:** sending closes the envelope's flap and presses a postmark. That's the one orchestrated motion, triggered by the visitor and skipped under reduced motion. The hero envelope straddles the edge of the blue field instead of sitting beside the copy.
- **Borrowed (Saul Bass challenger):** each section owns one flat colour field (blue, marigold, rose), one idea per field.
- **Honest risk:** the most playful. The postal metaphor can tip into cute, so it's kept typographic (postmarks are type on a ring, not drawings).

---

Content notes: the testimonials are verbatim, and trims are marked with "…". In az/ru each quote shows the English original plus a labelled translation. The blog excerpt is a real rule from this repo's seed script, labelled "Sample post". The Examination.az image is its logo; a real screenshot is still pending (SEED_REVIEW S-20).
