import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties } from "react";
import type { Locale } from "@portfolio/i18n/config";
import { LanguageSwitcher } from "@/components/LanguageSwitcher/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { Link } from "@/i18n/navigation";
import { CODE, EMAIL, getQuotes, IS_PROD, JOBS, PROJECT, ROUTE_STOPS, SOCIALS } from "../_shared/content";
import logo from "../_shared/examination-az.png";
import { geologica } from "../a/fonts";
import { ContactA, StarterA } from "./FormsMix";
import s from "./mix.module.scss";

/** A section heading is a station on the rail. */
function Station({ id, title }: { id: string; title: string }) {
  return (
    <h2 className={s.station} id={id}>
      <span className={s.stationRing} aria-hidden />
      {title}
    </h2>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  if (IS_PROD) return {};
  return { title: "Direction: mix (A + C + B)", robots: { index: false, follow: false } };
}

/**
 * The owner's mix (2026-10-08): A "Line" as the base (structure, Geologica, the route line,
 * night indigo, amber actions), C's warmth (full colour fields for testimonials and contact,
 * a warmer light neutral) and B's proof beside the hero. Dev only.
 */
export default async function DirectionMix({ params }: { params: Promise<{ locale: string }> }) {
  if (IS_PROD) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("directions");
  const { quotes, short, translationLabel } = await getQuotes(locale as Locale);

  return (
    <div className={`${geologica.variable} ${s.root}`}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/_design/directions/mix" className={s.brand}>
            {t("hero.name")}
          </Link>
          <nav aria-label={t("nav.label")} className={s.nav}>
            <a href="#work">{t("nav.work")}</a>
            <a href="#writing">{t("nav.writing")}</a>
            <a href="#experience">{t("nav.about")}</a>
            <a href="#contact">{t("nav.contact")}</a>
          </nav>
          <div className={s.tools}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={s.main}>
        <section className={s.hero} aria-labelledby="a-hero">
          <div className={s.heroTop}>
            <div className={s.heroLead}>
              <h1 className={s.title} id="a-hero">
                {t("hero.title")}
              </h1>
              <p className={s.lede}>
                <strong className={s.roleInline}>{t("hero.role")}.</strong> {t("hero.lede")}
              </p>
            </div>

            {/* Proof beside the claim, visible without scrolling on desktop. */}
            <aside className={s.heroProof}>
              <p className={s.nowLine}>
                <span className={s.nowDot} aria-hidden />
                <span>
                  {t("experience.prodata.title")}, <span className={s.nowOrg}>Prodata MMC</span>
                  <span className={s.nowPeriod}>{t("experience.prodata.period")}</span>
                </span>
              </p>
              <figure className={s.shortQuote}>
                <blockquote lang="en">
                  <p>{short.original}</p>
                </blockquote>
                {short.translation && (
                  <p className={s.shortTranslation}>
                    <span className={s.translationLabel}>{translationLabel}: </span>
                    {short.translation}
                  </p>
                )}
                <figcaption className={s.shortBy}>{short.by}</figcaption>
              </figure>
              <p className={s.proofLine}>{t("hero.proof")}</p>
            </aside>
          </div>

          <div className={s.heroFlow}>
            <div className={s.routeWrap}>
              <ol className={s.route} aria-label={t("route.label")}>
                {ROUTE_STOPS.map((stop, i) => (
                  <li
                    key={stop}
                    className={stop === "production" ? s.stopLive : s.stop}
                    style={{ "--i": i } as CSSProperties}
                  >
                    <span className={s.stopDot} aria-hidden />
                    <span className={s.stopName}>{t(`route.${stop}`)}</span>
                  </li>
                ))}
              </ol>
              <p className={s.routeCaption}>{t("route.caption")}</p>
            </div>

            <StarterA
              next={t("route.next")}
              labels={{
                label: t("starter.label"),
                placeholder: t("starter.placeholder"),
                email: t("starter.email"),
                send: t("starter.send"),
                sent: t("starter.sent"),
              }}
            />
          </div>
          <ul className={s.availability}>
            <li>{t("availability.freelance")}</li>
            <li>{t("availability.roles")}</li>
          </ul>
        </section>

        {/* One line from the first station to the last: it ends where you write to me. */}
        <div className={s.track}>
          <div className={s.rail} aria-hidden />

          <section className={s.section} aria-labelledby="work">
            <Station id="work" title={t("sections.work")} />
            <article className={s.project}>
              <div className={s.projectMark}>
                <Image src={logo} alt={t("project.alt")} sizes="160px" className={s.projectLogo} />
              </div>
              <div className={s.projectBody}>
                <h3 className={s.projectName}>{PROJECT.name}</h3>
                <p className={s.projectSummary}>{t("project.summary")}</p>
                <p className={s.projectRole}>{t("project.role")}</p>
                <p className={s.stack}>{PROJECT.stack.join(", ")}</p>
                <div className={s.projectLinks}>
                  <a href="#work" className={s.textLink}>
                    {t("project.cta")}
                  </a>
                  <a href={PROJECT.url} className={s.textLinkQuiet} rel="noopener" target="_blank">
                    {t("project.live")}
                  </a>
                </div>
              </div>
            </article>
          </section>

          <section className={s.section} aria-labelledby="writing">
            <Station id="writing" title={t("sections.writing")} />
            <article className={s.post}>
              <p className={s.postMeta}>{t("post.meta")}</p>
              <h3 className={s.postTitle}>
                <a href="#writing">{t("post.title")}</a>
              </h3>
              <p className={s.postExcerpt}>{t("post.excerpt")}</p>
              <figure className={s.code}>
                <figcaption className={s.codeFile}>{t("post.file")}</figcaption>
                <pre>
                  <code>
                    {CODE.map((line, i) => (
                      <span key={i} className={s.codeLine}>
                        {line.map(([kind, text], j) => (
                          <span key={j} className={s[`tok_${kind}`]}>
                            {text}
                          </span>
                        ))}
                      </span>
                    ))}
                  </code>
                </pre>
              </figure>
            </article>
          </section>

          <section className={s.section} aria-labelledby="experience">
            <Station id="experience" title={t("sections.experience")} />
            <ol className={s.jobs}>
              {JOBS.map((job) => (
                <li key={job.key} className={s.job}>
                  <span className={s.jobPeriod}>{t(`experience.${job.key}.period`)}</span>
                  <div>
                    <h3 className={s.jobTitle}>
                      {t(`experience.${job.key}.title`)}, <span className={s.jobOrg}>{job.org}</span>
                    </h3>
                    <p className={s.jobNote}>{t(`experience.${job.key}.note`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className={s.team}>{t("experience.team")}</p>
          </section>

          <section className={`${s.section} ${s.band} ${s.bandAmber}`} aria-labelledby="words">
            <Station id="words" title={t("sections.words")} />
            <div className={s.quotes}>
              {quotes.map((q) => (
                <figure key={q.by} className={s.quote}>
                  <blockquote lang="en" className={s.quoteText}>
                    <p>{q.original}</p>
                  </blockquote>
                  {q.translation && (
                    <p className={s.quoteTranslation}>
                      <span className={s.translationLabel}>{translationLabel}: </span>
                      {q.translation}
                    </p>
                  )}
                  <figcaption className={s.quoteBy}>
                    {q.by}, <span className={s.quoteSource}>{q.source}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          <div className={`${s.section} ${s.terminus} ${s.band} ${s.bandBlue}`}>
            <Station id="contact" title={t("sections.contact")} />
          </div>
        </div>

        <section className={`${s.contactSection} ${s.band} ${s.bandBlue}`} aria-labelledby="contact">
          <div className={s.contact}>
            <div className={s.contactIntro}>
              <p className={s.contactBody}>{t("contact.body")}</p>
              <ul className={`${s.availability} ${s.availabilityContact}`}>
                <li>{t("availability.freelance")}</li>
                <li>{t("availability.roles")}</li>
              </ul>
              <p className={s.contactBody}>{t("availability.timezone")}</p>
              <p className={s.contactBody}>
                {t("contact.direct")}{" "}
                <a className={s.textLink} href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
              </p>
            </div>
            <ContactA
              labels={{
                name: t("contact.name"),
                email: t("contact.email"),
                message: t("contact.message"),
                send: t("contact.send"),
                sent: t("contact.sent"),
              }}
            />
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <p>{t("footer.rights")}</p>
          <p className={s.footerQuiet}>{t("footer.built")}</p>
          <ul className={s.socials}>
            {SOCIALS.map((so) => (
              <li key={so.key}>
                <a href={so.url} rel="noopener" target="_blank">
                  {so.key}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
