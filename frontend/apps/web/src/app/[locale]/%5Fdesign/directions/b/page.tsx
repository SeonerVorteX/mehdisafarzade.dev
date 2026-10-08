import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@portfolio/i18n/config";
import { LanguageSwitcher } from "@/components/LanguageSwitcher/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { Link } from "@/i18n/navigation";
import { CODE, EMAIL, getQuotes, IS_PROD, JOBS, PROJECT, SOCIALS } from "../_shared/content";
import logo from "../_shared/examination-az.png";
import { ContactB, StarterB, Window } from "./ClientB";
import { commissioner } from "./fonts";
import s from "./b.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  if (IS_PROD) return {};
  return { title: "Direction B: Pane", robots: { index: false, follow: false } };
}

/** Direction B, "Pane" (between Linear and Comeau). Dev only. */
export default async function DirectionB({ params }: { params: Promise<{ locale: string }> }) {
  if (IS_PROD) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("directions");
  const { quotes, short, translationLabel } = await getQuotes(locale as Locale);

  return (
    <div className={`${commissioner.variable} ${s.root}`}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/_design/directions/b" className={s.brand}>
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
        <Window className={s.heroWindow} light>
          <section className={`${s.pane} ${s.clear} ${s.heroText}`} aria-labelledby="b-hero">
            <p className={s.role}>{t("hero.role")}</p>
            <h1 className={s.title} id="b-hero">
              {t("hero.title")}
            </h1>
            <p className={s.lede}>{t("hero.lede")}</p>
          </section>
          <a href="#work" className={`${s.pane} ${s.clear} ${s.edgeCobalt} ${s.heroProject}`}>
            <Image src={logo} alt="" sizes="64px" className={s.heroLogo} />
            <span className={`${s.paneTitle} ${s.paneLinkTitle}`}>{PROJECT.name}</span>
            <span className={s.paneText}>{t("project.role")}</span>
            <span className={s.proofLine}>{t("hero.proof")}</span>
          </a>
          <div className={`${s.pane} ${s.clear} ${s.edgeEmerald} ${s.heroNow}`}>
            <span className={s.paneTitle}>{t("experience.prodata.title")}, Prodata MMC</span>
            <span className={s.paneText}>{t("experience.prodata.note")}</span>
          </div>
          <figure className={`${s.pane} ${s.amber} ${s.heroProof}`}>
            <blockquote lang="en" className={s.shortQuote}>
              <p>{short.original}</p>
            </blockquote>
            {short.translation && (
              <p className={s.paneText}>
                <strong>{translationLabel}: </strong>
                {short.translation}
              </p>
            )}
            <figcaption className={s.paneText}>{short.by}</figcaption>
          </figure>
          <div className={`${s.pane} ${s.ruby} ${s.heroStarter}`}>
            <StarterB
              labels={{
                label: t("starter.label"),
                placeholder: t("starter.placeholder"),
                email: t("starter.email"),
                send: t("starter.send"),
                sent: t("starter.sent"),
              }}
            />
          </div>
        </Window>
        <ul className={s.availability}>
          <li>{t("availability.freelance")}</li>
          <li>{t("availability.roles")}</li>
        </ul>

        <section className={s.section} aria-labelledby="work">
          <h2 className={s.h2} id="work">
            {t("sections.work")}
          </h2>
          <Window className={s.workWindow}>
            <article className={`${s.pane} ${s.clear} ${s.workText}`}>
              <h3 className={s.h3}>{PROJECT.name}</h3>
              <p className={s.bodyLarge}>{t("project.summary")}</p>
              <p className={s.muted}>{t("project.role")}</p>
              <p className={s.stack}>{PROJECT.stack.join(", ")}</p>
              <p className={s.links}>
                <a href="#work" className={s.textLink}>
                  {t("project.cta")}
                </a>
                <a href={PROJECT.url} className={s.textLinkQuiet} rel="noopener" target="_blank">
                  {t("project.live")}
                </a>
              </p>
            </article>
            <div className={`${s.pane} ${s.walnut} ${s.workMark}`}>
              <Image src={logo} alt={t("project.alt")} sizes="200px" className={s.workLogo} />
            </div>
          </Window>
        </section>

        <section className={s.section} aria-labelledby="experience">
          <h2 className={s.h2} id="experience">
            {t("sections.experience")}
          </h2>
          <ol className={s.jobs}>
            {JOBS.map((job) => (
              <li key={job.key} className={s.job}>
                <span className={s.jobPeriod}>{t(`experience.${job.key}.period`)}</span>
                <div>
                  <h3 className={s.jobTitle}>
                    {t(`experience.${job.key}.title`)}, <span className={s.muted}>{job.org}</span>
                  </h3>
                  <p className={s.jobNote}>{t(`experience.${job.key}.note`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className={s.team}>{t("experience.team")}</p>
        </section>

        <section className={s.section} aria-labelledby="words">
          <h2 className={s.h2} id="words">
            {t("sections.words")}
          </h2>
          <Window className={s.wordsWindow}>
            {quotes.map((q, i) => (
              <figure key={q.by} className={`${s.pane} ${i === 0 ? s.amber : s.clear} ${s.quote}`}>
                <blockquote lang="en" className={s.quoteText}>
                  <p>{q.original}</p>
                </blockquote>
                {q.translation && (
                  <p className={s.quoteTranslation}>
                    <strong>{translationLabel}: </strong>
                    {q.translation}
                  </p>
                )}
                <figcaption className={s.quoteBy}>
                  {q.by}, <span className={s.quoteSource}>{q.source}</span>
                </figcaption>
              </figure>
            ))}
          </Window>
        </section>

        <section className={s.section} aria-labelledby="writing">
          <h2 className={s.h2} id="writing">
            {t("sections.writing")}
          </h2>
          <Window className={s.postWindow}>
            <article className={`${s.pane} ${s.clear} ${s.post}`}>
              <p className={s.muted}>{t("post.meta")}</p>
              <h3 className={s.h3}>
                <a href="#writing" className={s.postLink}>
                  {t("post.title")}
                </a>
              </h3>
              <p className={s.bodyLarge}>{t("post.excerpt")}</p>
            </article>
            <figure className={`${s.pane} ${s.walnut} ${s.code}`}>
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
          </Window>
        </section>

        <section className={s.section} aria-labelledby="contact">
          <h2 className={s.h2} id="contact">
            {t("sections.contact")}
          </h2>
          <Window className={s.contactWindow}>
            <div className={`${s.pane} ${s.ruby} ${s.contactForm_pane}`}>
              <p className={s.paneTitle}>{t("contact.title")}</p>
              <ContactB
                labels={{
                  name: t("contact.name"),
                  email: t("contact.email"),
                  message: t("contact.message"),
                  send: t("contact.send"),
                  sent: t("contact.sent"),
                }}
              />
            </div>
            <div className={`${s.pane} ${s.clear} ${s.contactText}`}>
              <p className={s.bodyLarge}>{t("contact.body")}</p>
              <p className={s.muted}>{t("availability.timezone")}</p>
              <p>
                {t("contact.direct")}{" "}
                <a className={s.textLink} href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
              </p>
            </div>
          </Window>
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
