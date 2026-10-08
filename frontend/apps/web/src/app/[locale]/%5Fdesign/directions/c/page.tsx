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
import { Envelope, Postmark } from "./ClientC";
import { nunito } from "./fonts";
import s from "./c.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  if (IS_PROD) return {};
  return { title: "Direction C: Post", robots: { index: false, follow: false } };
}

/** Direction C, "Post" (closest to Josh Comeau). Dev only. */
export default async function DirectionC({ params }: { params: Promise<{ locale: string }> }) {
  if (IS_PROD) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("directions");
  const { quotes, translationLabel } = await getQuotes(locale as Locale);

  const envelope = {
    to: t("post_c.to"),
    toValue: t("post_c.toValue"),
    from: t("post_c.from"),
    about: t("post_c.about"),
    placeholder: t("starter.placeholder"),
    send: t("starter.send"),
    sent: t("starter.sent"),
    stamp: t("post_c.stamp"),
    city: t("post_c.city"),
    fromPlaceholder: t("post_c.fromPlaceholder"),
  };

  return (
    <div className={`${nunito.variable} ${s.root}`}>
      <div className={s.heroField}>
        <header className={s.header}>
          <Link href="/_design/directions/c" className={s.brand}>
            {t("hero.name")}
          </Link>
          <nav aria-label={t("nav.label")} className={s.nav}>
            <a href="#writing">{t("nav.writing")}</a>
            <a href="#work">{t("nav.work")}</a>
            <a href="#experience">{t("nav.about")}</a>
            <a href="#contact">{t("nav.contact")}</a>
          </nav>
          <div className={s.tools}>
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <section className={s.hero} aria-labelledby="c-hero">
          <h1 className={s.title} id="c-hero">
            {t("hero.title")}
          </h1>
          <div className={s.heroCopy}>
            <p className={s.lede}>
              <strong className={s.roleInline}>{t("hero.role")}.</strong> {t("hero.lede")}
            </p>
            <p className={s.proof}>{t("hero.proof")}</p>
          </div>
          <div className={s.heroEnvelope}>
            <Envelope labels={envelope} />
          </div>
        </section>
      </div>

      <main id="main" tabIndex={-1} className={s.main}>
        <section className={s.dispatches} aria-labelledby="writing">
          <h2 className={s.h2} id="writing">
            {t("post_c.dispatches")}
          </h2>
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
            <a href="#writing" className={s.textLink}>
              {t("post.cta")}
            </a>
          </article>
        </section>

        <section className={s.lettersField} aria-labelledby="words">
          <div className={s.inner}>
            <h2 className={s.h2} id="words">
              {t("post_c.received")}
            </h2>
            <div className={s.letters}>
              {quotes.map((q) => (
                <figure key={q.by} className={s.letter}>
                  <Postmark top={q.source.split(",")[0] ?? q.source} bottom={q.source.split(", ")[1]} className={s.letterMark} />
                  <blockquote lang="en" className={s.letterText}>
                    <p>{q.original}</p>
                  </blockquote>
                  {q.translation && (
                    <p className={s.letterTranslation}>
                      <strong>{translationLabel}: </strong>
                      {q.translation}
                    </p>
                  )}
                  <figcaption className={s.letterBy}>
                    {q.by}, <span className={s.letterSource}>{q.source}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className={s.section} aria-labelledby="work">
          <h2 className={s.h2} id="work">
            {t("post_c.postcard")}
          </h2>
          <article className={s.postcard}>
            <div className={s.postcardPicture}>
              <Image src={logo} alt={t("project.alt")} sizes="200px" className={s.postcardLogo} />
            </div>
            <div className={s.postcardBack}>
              <h3 className={s.postcardTitle}>{PROJECT.name}</h3>
              <p className={s.postcardSummary}>{t("project.summary")}</p>
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
            </div>
          </article>
        </section>

        <section className={s.section} aria-labelledby="experience">
          <h2 className={s.h2} id="experience">
            {t("sections.experience")}
          </h2>
          <ol className={s.jobs}>
            {JOBS.map((job) => (
              <li key={job.key} className={s.job}>
                <p className={s.jobPeriod}>{t(`experience.${job.key}.period`)}</p>
                <h3 className={s.jobTitle}>
                  {t(`experience.${job.key}.title`)} <span className={s.jobOrg}>{job.org}</span>
                </h3>
                <p className={s.jobNote}>{t(`experience.${job.key}.note`)}</p>
              </li>
            ))}
          </ol>
          <p className={s.team}>{t("experience.team")}</p>
        </section>

        <section className={s.contactField} aria-labelledby="contact">
          <div className={s.contactInner}>
            <div>
              <h2 className={s.h2} id="contact">
                {t("contact.title")}
              </h2>
              <p className={s.contactBody}>{t("contact.body")}</p>
              <ul className={s.availability}>
                <li>{t("availability.freelance")}</li>
                <li>{t("availability.roles")}</li>
              </ul>
              <p className={s.contactBody}>{t("availability.timezone")}</p>
              <p className={s.contactBody}>
                {t("contact.direct")}{" "}
                <a className={s.contactMail} href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
              </p>
            </div>
            <Envelope labels={{ ...envelope, send: t("contact.send"), sent: t("contact.sent") }} wide />
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <p>{t("footer.rights")}</p>
        <p className={s.muted}>{t("footer.built")}</p>
        <ul className={s.socials}>
          {SOCIALS.map((so) => (
            <li key={so.key}>
              <a href={so.url} rel="noopener" target="_blank">
                {so.key}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
