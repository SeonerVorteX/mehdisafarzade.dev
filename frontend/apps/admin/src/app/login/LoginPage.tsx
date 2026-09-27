"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { APIError, applyApiErrorsToForm } from "@portfolio/api";
import { adminPaths, type AdminLoginResponse } from "@portfolio/api/admin";
import { AuthCard } from "@/components/AuthCard/AuthCard";
import { Field } from "@/components/Field/Field";
import { adminFetch } from "@/lib/adminClient";
import { safeNextPath } from "@/lib/session";

const KNOWN_ERRORS = ["sessionExpired"] as const;

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
    </AuthCard>
  );
}
