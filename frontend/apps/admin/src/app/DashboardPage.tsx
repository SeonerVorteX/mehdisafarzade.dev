"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminPaths, type AdminMe, type AdminSessionInfo } from "@portfolio/api/admin";
import { adminFetch } from "@/lib/adminClient";

interface DashboardPageProps {
  me: AdminMe;
  sessions: AdminSessionInfo[];
}

/** Bare admin shell (Phase 3 checkpoint): who am I, which device, active sessions, sign out. */
export function DashboardPage({ me, sessions }: DashboardPageProps) {
  const t = useTranslations("shell");
  const format = useFormatter();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async (all: boolean) => {
    setBusy(true);
    try {
      await adminFetch(all ? adminPaths.auth.logoutAll : adminPaths.auth.logout, { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    try {
      await adminFetch(adminPaths.auth.session(id), { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const date = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="shell">
      <header className="shell__bar">
        <span className="shell__brand">{t("title")}</span>
        <div className="shell__actions">
          <button className="button button--ghost" type="button" disabled={busy} onClick={() => void signOut(false)}>
            {t("logout")}
          </button>
        </div>
      </header>
      <main className="shell__main">
        <section className="panel">
          <h1 className="panel__title">{t("signedInAs", { email: me.email })}</h1>
          <ul className="panel__facts">
            <li>{t("device", { device: me.device })}</li>
            <li>{t("lastLogin", { date: date(me.lastLoginAt) })}</li>
            <li>{t("recoveryLeft", { count: me.remainingRecoveryCodes })}</li>
          </ul>
          <p className="panel__muted">{t("placeholder")}</p>
        </section>

        <section className="panel">
          <h2 className="panel__title">{t("sessions")}</h2>
          <ul className="sessions">
            {sessions.map((s) => (
              <li key={s.id} className="sessions__item">
                <div>
                  <strong>{s.deviceName}</strong>
                  {s.current ? <span className="badge">{t("current")}</span> : null}
                  <div className="panel__muted">{t("started", { date: date(s.createdAt) })}</div>
                </div>
                {!s.current ? (
                  <button className="button button--ghost" type="button" disabled={busy} onClick={() => void revoke(s.id)}>
                    {t("revoke")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <button className="button button--danger" type="button" disabled={busy} onClick={() => void signOut(true)}>
            {t("logoutAll")}
          </button>
        </section>
      </main>
    </div>
  );
}
