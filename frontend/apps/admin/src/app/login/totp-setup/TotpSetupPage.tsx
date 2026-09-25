"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { APIError, applyApiErrorsToForm } from "@portfolio/api";
import { adminPaths, type AdminPending, type AdminTotpEnable, type AdminTotpSetup } from "@portfolio/api/admin";
import { AuthCard } from "@/components/AuthCard/AuthCard";
import { Field } from "@/components/Field/Field";
import { adminFetch } from "@/lib/adminClient";

function downloadCodes(codes: string[]) {
  const blob = new Blob([`mehdisafarzade.dev admin: recovery codes\n\n${codes.join("\n")}\n`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: "mehdisafarzade-admin-recovery-codes.txt" });
  a.click();
  URL.revokeObjectURL(url);
}

export function TotpSetupPage() {
  const t = useTranslations();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  const pending = useQuery({
    queryKey: ["admin-auth-pending"],
    queryFn: () => adminFetch<AdminPending>(adminPaths.auth.pending).then((r) => r.data),
    refetchOnMount: "always",
    enabled: codes === null,
  });
  const setup = useQuery({
    queryKey: ["admin-totp-setup"],
    queryFn: () => adminFetch<AdminTotpSetup>(adminPaths.auth.totpSetup, { method: "POST" }).then((r) => r.data),
    enabled: pending.data?.step === "totp-setup",
  });

  useEffect(() => {
    if (codes !== null || !pending.data) return;
    if (pending.data.step === "totp") router.replace("/login/totp");
    else if (pending.data.step === null) router.replace("/login?error=sessionExpired");
  }, [pending.data, codes, router]);

  const schema = z.object({ code: z.string().regex(/^\d{6}$/, t("validation.code")) });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { code: "" } });

  const onSubmit = form.handleSubmit(async ({ code }) => {
    try {
      const { data } = await adminFetch<AdminTotpEnable>(adminPaths.auth.totpEnable, { method: "POST", body: { code } });
      setCodes(data.recoveryCodes);
    } catch (err) {
      if (err instanceof APIError) applyApiErrorsToForm(err.errors, form.setError, t);
      else form.setError("root", { message: t("errors.unknown") });
    }
  });

  if (codes) {
    return (
      <AuthCard title={t("setup.recoveryTitle")} subtitle={t("setup.recoveryBody")}>
        <ol className="recovery-codes" aria-label={t("setup.recoveryTitle")}>
          {codes.map((c) => (
            <li key={c}>
              <code>{c}</code>
            </li>
          ))}
        </ol>
        <button className="button button--secondary" type="button" onClick={() => downloadCodes(codes)}>
          {t("setup.download")}
        </button>
        <label className="checkbox">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          <span>{t("setup.confirm")}</span>
        </label>
        <button
          className="button button--primary"
          type="button"
          disabled={!saved}
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
        >
          {t("setup.continue")}
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("setup.title")} subtitle={t("setup.subtitle")}>
      <ol className="setup-steps">
        <li>
          <p>{t("setup.step1")}</p>
          {setup.data ? (
            <>
              <div className="qr">
                <QRCodeSVG value={setup.data.otpauthUrl} size={176} marginSize={2} title={t("setup.step1")} />
              </div>
              <p className="setup-steps__hint">{t("setup.manual")}</p>
              <div className="secret">
                <code>{setup.data.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    void navigator.clipboard.writeText(setup.data.secret);
                    setCopied(true);
                  }}
                >
                  {copied ? t("setup.copied") : t("setup.copy")}
                </button>
              </div>
            </>
          ) : (
            <p className="setup-steps__hint">{t("common.loading")}</p>
          )}
        </li>
        <li>
          <p>{t("setup.step2")}</p>
          <form className="auth__form" onSubmit={onSubmit} noValidate>
            <Field
              label={t("setup.code")}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              error={form.formState.errors.code?.message}
              {...form.register("code")}
            />
            {form.formState.errors.root ? (
              <p className="auth__alert" role="alert">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <button
              className="button button--primary"
              type="submit"
              disabled={form.formState.isSubmitting || !setup.data}
            >
              {form.formState.isSubmitting ? t("setup.submitting") : t("setup.submit")}
            </button>
          </form>
        </li>
      </ol>
    </AuthCard>
  );
}
