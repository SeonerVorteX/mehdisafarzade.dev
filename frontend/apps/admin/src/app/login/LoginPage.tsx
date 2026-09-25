"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { APIError, applyApiErrorsToForm } from "@portfolio/api";
import { adminPaths, type AdminAuthConfig, type AdminLoginResponse } from "@portfolio/api/admin";
import { AuthCard } from "@/components/AuthCard/AuthCard";
import { Field } from "@/components/Field/Field";
import { ADMIN_API_BASE } from "@/config/env";
import { adminFetch } from "@/lib/adminClient";
import { safeNextPath } from "@/lib/session";

const KNOWN_ERRORS = [
  "google_cancelled",
  "google_denied",
  "google_state",
  "google_exchange",
  "google_disabled",
  "sessionExpired",
] as const;

interface LoginPageProps {
  error?: string;
  next?: string;
}

export function LoginPage({ error, next }: LoginPageProps) {
  const t = useTranslations();
  const router = useRouter();

  const schema = z.object({
    email: z.email(t("validation.email")),
    password: z.string().min(1, t("validation.required")),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const config = useQuery({
    queryKey: ["admin-auth-config"],
    queryFn: () => adminFetch<AdminAuthConfig>(adminPaths.auth.config).then((r) => r.data),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { data } = await adminFetch<AdminLoginResponse>(adminPaths.auth.login, { method: "POST", body: values });
      const dest = data.step === "totp" ? "/login/totp" : "/login/totp-setup";
      router.push(next ? `${dest}?next=${encodeURIComponent(safeNextPath(next))}` : dest);
    } catch (err) {
      if (err instanceof APIError) applyApiErrorsToForm(err.errors, form.setError, t);
      else form.setError("root", { message: t("errors.unknown") });
    }
  });

  const knownError = KNOWN_ERRORS.find((e) => e === error);

  return (
    <AuthCard title={t("login.title")} subtitle={t("login.subtitle")}>
      {knownError ? (
        <p className="auth__alert" role="alert">
          {t(`login.errors.${knownError}`)}
        </p>
      ) : null}
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        <Field
          label={t("login.email")}
          type="email"
          autoComplete="username"
          autoFocus
          error={form.formState.errors.email?.message}
          {...form.register("email")}
        />
        <Field
          label={t("login.password")}
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        {form.formState.errors.root ? (
          <p className="auth__alert" role="alert">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        <button className="button button--primary" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
      {config.data?.googleEnabled ? (
        <>
          <div className="auth__divider">
            <span>{t("login.or")}</span>
          </div>
          {/* A full navigation (not fetch): the OAuth round-trip must be top-level. */}
          <a className="button button--secondary" href={`${ADMIN_API_BASE}${adminPaths.auth.google}`}>
            {t("login.google")}
          </a>
        </>
      ) : null}
    </AuthCard>
  );
}
