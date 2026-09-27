"use client";

import { ArrowRight, ArrowUpRight, Info } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { contrastRatio, wcagLevel } from "@portfolio/ui/lib";
import { Reveal } from "@/components/Reveal/Reveal";
import { SectionHeading } from "@/components/SectionHeading/SectionHeading";

type Accent = "vermilion" | "lime";

const CANDIDATES = [
  { letter: "A", name: "Fraunces", face: "var(--font-fraunces)", variable: true },
  { letter: "B", name: "Instrument Serif", face: "var(--font-instrument)", variable: false },
] as const;

const NEUTRALS = ["bg", "bg-elevated", "bg-sunken", "fg", "fg-secondary", "muted", "border", "border-strong"];
const ACCENTS = ["accent", "accent-fg", "accent-text", "accent-soft"];
const SCALE = ["5xl", "4xl", "3xl", "2xl", "xl", "lg", "md", "sm", "xs", "xxs"];
const SECTIONS = ["display", "text", "scale", "color", "components", "layout", "motion"] as const;
const GLYPHS = "Əə Ğğ Iı İi Şş Çç Öö Üü · Жж Щщ Ыы Юю Яя · 0123456789 &?!";

const CODE = `export async function publishDue(now = new Date()) {
  const due = await prisma.post.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
  });
  return due.map((p) => p.id); // → ["cm1x…"]
}`;

/** Re-reads computed colours whenever the theme or accent attribute on <html> changes. */
function useHtmlAttrs() {
  return useSyncExternalStore(
    (cb) => {
      const mo = new MutationObserver(cb);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });
      return () => mo.disconnect();
    },
    () => `${document.documentElement.dataset.theme}|${document.documentElement.dataset.accent ?? ""}`,
    () => "",
  );
}

/** Computed token value; "" on the server and during hydration (attrs is "" there). */
function readToken(name: string, attrs: string): string {
  if (!attrs) return "";
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}

function Swatch({ name, attrs, against = "bg" }: { name: string; attrs: string; against?: string }) {
  const value = readToken(name, attrs);
  const base = readToken(against, attrs);
  let ratio: number | null = null;
  try {
    ratio = value && base ? contrastRatio(value, base) : null;
  } catch {
    ratio = null;
  }
  return (
    <li className="swatch">
      <span className="swatch__chip" style={{ background: `var(--color-${name})` }} />
      <span className="swatch__name">--color-{name}</span>
      <span className="swatch__value">{value}</span>
      {ratio !== null && name !== against && (
        <span className="swatch__ratio" data-level={wcagLevel(ratio)}>
          {ratio.toFixed(2)} · {wcagLevel(ratio)}
        </span>
      )}
    </li>
  );
}

function PairRatio({ fg, bg, label, attrs }: { fg: string; bg: string; label: string; attrs: string }) {
  const f = readToken(fg, attrs);
  const b = readToken(bg, attrs);
  const ratio = f && b ? contrastRatio(f, b) : null;
  return (
    <div className="pair" style={{ background: `var(--color-${bg})`, color: `var(--color-${fg})` }}>
      <span>{label}</span>
      {ratio !== null && (
        <span className="pair__ratio" data-level={wcagLevel(ratio)}>
          {ratio.toFixed(2)} · {wcagLevel(ratio)}
        </span>
      )}
    </div>
  );
}

export function DesignTile() {
  const t = useTranslations("design");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const attrs = useHtmlAttrs();
  const [accent, setAccent] = useState<Accent>("vermilion");
  const [grid, setGrid] = useState(false);
  const [replay, setReplay] = useState(0);

  // The accent candidate lives on <html> so the header and everything else follows it.
  useEffect(() => {
    const html = document.documentElement;
    if (accent === "lime") html.dataset.accent = "lime";
    else delete html.dataset.accent;
    return () => {
      delete html.dataset.accent;
    };
  }, [accent]);

  const heading = (key: (typeof SECTIONS)[number]) => (
    <SectionHeading index={SECTIONS.indexOf(key) + 1} label={t("label")} title={t(`sections.${key}`)} />
  );

  return (
    <div className="design" data-grid={grid || undefined}>
      {grid && (
        <div className="design__grid-overlay container" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      )}

      <section className="container design__intro">
        <p className="micro-label">{t("label")}</p>
        <h1 className="display-xl">{t("title")}</h1>
        <p className="lead">{t("intro")}</p>

        <div className="design__controls" role="group" aria-label={t("controls")}>
          <span className="micro-label">{t("accent")}</span>
          <div className="segmented" role="radiogroup" aria-label={t("accent")}>
            {(["vermilion", "lime"] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={accent === a}
                data-active={accent === a || undefined}
                className="segmented__item segmented__item--text"
                onClick={() => setAccent(a)}
              >
                <span className={`design__dot design__dot--${a}`} aria-hidden />
                {t(a)}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />
            <span>{t("grid")}</span>
          </label>
        </div>
      </section>

      {/* 01 display candidates, side by side */}
      <section className="container design__section">
        {heading("display")}
        <div className="design__candidates">
          {CANDIDATES.map((c) => (
            <article key={c.letter} className="candidate" style={locale === "ru" ? undefined : { ["--font-display" as string]: `${c.face}, Georgia, serif` }}>
              <header className="candidate__head">
                <span className="micro-label">{t("candidate", { letter: c.letter })}</span>
                <span className="candidate__name">{c.name}</span>
                <span className="candidate__meta">{c.variable ? t("variable") : t("single")}</span>
              </header>
              <p className="candidate__role micro-label">{t("sampleRole")}</p>
              <p className="display-xl candidate__hero">{t("sampleName")}</p>
              <p className="display-lg">{t("sampleHeadline")}</p>
              <p className="display-md candidate__italic">
                <em>“{t("sampleQuote")}”</em>
              </p>
              <div className="candidate__row">
                <span className="section-heading__numeral">01</span>
                <span className="section-heading__numeral">07</span>
                <span className="section-heading__numeral">42</span>
              </div>
              <p className="micro-label">{t("glyphs")}</p>
              <p className="display-sm candidate__glyphs">{GLYPHS}</p>
              <p className="notice notice--info">
                <Info aria-hidden size={16} strokeWidth={1.75} />
                <span>{t("cyrillicNote")}</span>
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* 02 body / UI / code */}
      <section className="container design__section">
        {heading("text")}
        <div className="design__text">
          <div className="prose">
            <h3>{t("bodyTitle")}</h3>
            <p>{t("body")}</p>
            <p className="text-secondary">{t("bodySmall")}</p>
            <p>
              <a href="#main">{t("link")}</a> · <code>{'revalidateTag("posts")'}</code>
            </p>
          </div>
          <figure className="code-block">
            <figcaption className="micro-label">{t("codeLabel")}</figcaption>
            <pre>
              <code>{CODE}</code>
            </pre>
          </figure>
        </div>
      </section>

      {/* 03 type scale */}
      <section className="container design__section">
        {heading("scale")}
        <ol className="scale">
          {SCALE.map((s) => (
            <li key={s} className="scale__row">
              <span className="micro-label">--fs-{s}</span>
              <span
                className="scale__sample"
                style={{
                  fontSize: `var(--fs-${s})`,
                  fontFamily: SCALE.indexOf(s) < 5 ? "var(--font-display)" : "var(--font-sans)",
                }}
              >
                {t("sampleName")}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* 04 colour + contrast */}
      <section className="container design__section">
        {heading("color")}
        <p className="micro-label">{t("swatches")}</p>
        <ul className="swatches">
          {NEUTRALS.map((n) => (
            <Swatch key={n} name={n} attrs={attrs} />
          ))}
        </ul>
        <ul className="swatches">
          {ACCENTS.map((n) => (
            <Swatch key={n} name={n} attrs={attrs} />
          ))}
        </ul>
        <div className="pairs">
          <PairRatio fg="accent-fg" bg="accent" label={t("onAccent")} attrs={attrs} />
          <PairRatio fg="accent-text" bg="bg" label={t("accentText")} attrs={attrs} />
          <PairRatio fg="accent-text" bg="bg-elevated" label={t("accentText")} attrs={attrs} />
          <PairRatio fg="muted" bg="bg-sunken" label="--color-muted / bg-sunken" attrs={attrs} />
        </div>
      </section>

      {/* 05 components */}
      <section className="container design__section">
        {heading("components")}
        <div className="design__components">
          <div className="stack">
            <p className="micro-label">{t("buttons")}</p>
            <div className="row">
              <button type="button" className="btn btn--primary">
                {t("primary")}
                <ArrowRight aria-hidden size={16} strokeWidth={1.75} />
              </button>
              <button type="button" className="btn btn--secondary">
                {t("secondary")}
              </button>
              <button type="button" className="btn btn--ghost">
                {t("ghost")}
              </button>
              <button type="button" className="btn btn--primary" disabled>
                {t("disabled")}
              </button>
            </div>
            <p className="micro-label">{t("chips")}</p>
            <div className="row">
              {["TypeScript", "Next.js", "NestJS", "PostgreSQL", "RabbitMQ"].map((c, i) => (
                <span key={c} className="chip" data-active={i === 0 || undefined}>
                  {c}
                </span>
              ))}
            </div>
            <p className="notice">
              <Info aria-hidden size={16} strokeWidth={1.75} />
              <span>{t("notice")}</span>
            </p>
          </div>

          <form className="stack form" onSubmit={(e) => e.preventDefault()}>
            <p className="micro-label">{t("form")}</p>
            <label className="field">
              <span className="field__label">{t("name")}</span>
              <input className="input" autoComplete="off" />
            </label>
            <label className="field" data-invalid>
              <span className="field__label">{t("email")}</span>
              <input className="input" aria-invalid defaultValue="mehdi@" autoComplete="off" />
              <span className="field__error">{t("error")}</span>
            </label>
            <label className="field">
              <span className="field__label">{t("projectType")}</span>
              <select className="input" defaultValue="web">
                {(["web", "api", "other"] as const).map((o) => (
                  <option key={o} value={o}>
                    {t(`projectTypes.${o}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">{t("message")}</span>
              <textarea className="input" rows={3} placeholder={t("messagePlaceholder")} />
            </label>
          </form>
        </div>
      </section>

      {/* 06 bento + timeline */}
      <section className="container design__section">
        {heading("layout")}
        <div className="bento">
          <article className="card bento__a">
            <div className="card__media" aria-hidden />
            <p className="micro-label">{t("card.label")}</p>
            <h3 className="display-md">{t("card.title")}</h3>
            <p className="text-secondary">{t("card.body")}</p>
            <a href="#main" className="card__cta">
              {t("card.cta")}
              <ArrowUpRight aria-hidden size={16} strokeWidth={1.75} />
            </a>
          </article>
          <article className="card bento__b">
            <p className="micro-label">{t("bento.b")}</p>
            <div className="row">
              {["TS", "React", "Nest", "Prisma", "Redis", "Docker"].map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
          </article>
          <article className="card card--accent bento__c">
            <p className="micro-label">{t("bento.c")}</p>
            <p className="display-md">{t("sampleHeadline")}</p>
          </article>
          <article className="card bento__d">
            <p className="micro-label">{t("bento.d")}</p>
            <p className="display-sm">{t("sampleQuote")}</p>
          </article>
        </div>

        <ol className="timeline">
          <li className="timeline__item">
            <span className="micro-label">{t("timeline.period")}</span>
            <div>
              <h3 className="timeline__role">{t("timeline.role")}</h3>
              <p className="text-secondary">{t("timeline.org")}</p>
              <p>{t("timeline.summary")}</p>
            </div>
          </li>
        </ol>
      </section>

      {/* 07 motion */}
      <section className="container design__section">
        {heading("motion")}
        <p className="lead">{t("motionBody")}</p>
        <p className="micro-label">{t("reduced", { state: reduce ? t("on") : t("off") })}</p>
        <button type="button" className="btn btn--secondary" onClick={() => setReplay((n) => n + 1)}>
          {t("replay")}
        </button>
        <div className="design__motion" key={replay}>
          {[0, 1, 2].map((i) => (
            <Reveal key={i} delay={i * 0.08} className="card">
              <p className="display-sm">{String(i + 1).padStart(2, "0")}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
