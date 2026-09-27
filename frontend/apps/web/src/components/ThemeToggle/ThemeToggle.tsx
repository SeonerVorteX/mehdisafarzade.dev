"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { COOKIE_DOMAIN, isTheme, THEMES, type Theme } from "@portfolio/config";
import { resolveTheme, themeCookie } from "@portfolio/ui/lib";

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const DARK_QUERY = "(prefers-color-scheme: dark)";
const IS_PROD = process.env.NODE_ENV === "production";

function readPref(): Theme {
  const v = document.documentElement.getAttribute("data-theme-pref");
  return isTheme(v) ? v : "system";
}

function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-pref"] });
  return () => mo.disconnect();
}

function persist(pref: Theme) {
  document.cookie = themeCookie(pref, IS_PROD ? { domain: COOKIE_DOMAIN, secure: true } : {});
}

function apply(pref: Theme) {
  const html = document.documentElement;
  html.setAttribute("data-theme", resolveTheme(pref, window.matchMedia(DARK_QUERY).matches));
  html.setAttribute("data-theme-pref", pref);
}

/**
 * Light / dark / system. The initial state comes from the attributes THEME_SCRIPT set
 * before paint (so SSR stays static); the choice persists in the shared `theme` cookie.
 */
export function ThemeToggle() {
  const t = useTranslations("theme");
  // Server snapshot is null: no option is marked until hydration (avoids a mismatch).
  const pref = useSyncExternalStore(subscribe, readPref, () => null);

  // `system` follows OS changes live.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = (next: Theme) => {
    persist(next);
    apply(next);
  };

  return (
    <div className="segmented" role="radiogroup" aria-label={t("label")}>
      {THEMES.map((option) => {
        const Icon = ICONS[option];
        const active = pref === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            className="segmented__item"
            data-active={active || undefined}
            title={t(option)}
            onClick={() => choose(option)}
          >
            <Icon aria-hidden size={16} strokeWidth={1.75} />
            <span className="visually-hidden">{t(option)}</span>
          </button>
        );
      })}
    </div>
  );
}
