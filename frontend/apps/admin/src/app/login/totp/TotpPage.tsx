"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { APIError, applyApiErrorsToForm } from "@portfolio/api";
import { adminPaths, type AdminPending, type AdminTotpVerify } from "@portfolio/api/admin";
import { AuthCard } from "@/components/AuthCard/AuthCard";
import { Field } from "@/components/Field/Field";
import { adminFetch } from "@/lib/adminClient";
import { safeNextPath } from "@/lib/session";

export function TotpPage({ next }: { next?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [mode, setMode] = useState<"app" | "recovery">("app");
  const [recoveryNotice, setRecoveryNotice] = useState<number | null>(null);

  const pending = useQuery({
    queryKey: ["admin-auth-pending"],
    queryFn: () => adminFetch<AdminPending>(adminPaths.auth.pending).then((r) => r.data),
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (pending.data?.step === "totp-setup") router.replace("/login/totp-setup");
    else if (pending.data && pending.data.step === null) router.replace("/login?error=sessionExpired");
  }, [pending.data, router]);

  const schema = z.object({
    code:
      mode === "app"
        ? z.string().regex(/^\d{6}$/, t("validation.code"))
        : z.string().regex(/^[a-zA-Z0-9]{5}-?[a-zA-Z0-9]{5}$/, t("validation.recovery")),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { code: "" } });

  const onSubmit = form.handleSubmit(async ({ code }) => {
    try {
      const { data } = await adminFetch<AdminTotpVerify>(adminPaths.auth.totpVerify, {
        method: "POST",
        body: { code: code.trim() },
      });
      if (data.usedRecoveryCode) {
        setRecoveryNotice(data.remainingRecoveryCodes);
        return;
      }
      router.replace(safeNextPath(next));
      router.refresh();
    } catch (err) {
      if (err instanceof APIError) applyApiErrorsToForm(err.errors, form.setError, t);
      else form.setError("root", { message: t("errors.unknown") });
    }
  });

  if (recoveryNotice !== null) {
    return (
      <AuthCard title={t("totp.title")}>
        <p className="auth__alert auth__alert--warning" role="status">
          {t("totp.recoveryUsed", { remaining: recoveryNotice })}
        </p>
        <button
          className="button button--primary"
          type="button"
          onClick={() => {
            router.replace(safeNextPath(next));
            router.refresh();
          }}
        >
          {t("setup.continue")}
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("totp.title")} subtitle={mode === "app" ? t("totp.subtitle") : undefined}>
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {mode === "app" ? (
          <Field
            key="app"
            label={t("totp.code")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            error={form.formState.errors.code?.message}
            {...form.register("code")}
          />
        ) : (
          <Field
            key="recovery"
            label={t("totp.recoveryCode")}
            autoComplete="off"
            spellCheck={false}
            maxLength={11}
            autoFocus
            error={form.formState.errors.code?.message}
            {...form.register("code")}
          />
        )}
        {form.formState.errors.root ? (
          <p className="auth__alert" role="alert">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <button className="button button--primary" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("totp.submitting") : t("totp.submit")}
        </button>
      </form>
      <div className="auth__links">
        <button
          type="button"
          className="link-button"
          onClick={() => {
            form.reset({ code: "" });
            setMode(mode === "app" ? "recovery" : "app");
          }}
        >
          {mode === "app" ? t("totp.useRecovery") : t("totp.useApp")}
        </button>
        <a className="link-button" href="/login">
          {t("totp.back")}
        </a>
      </div>
    </AuthCard>
  );
}
