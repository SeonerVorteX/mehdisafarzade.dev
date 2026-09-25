import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="auth">
      <section className="auth__card" aria-labelledby="auth-title">
        <header className="auth__header">
          <h1 id="auth-title" className="auth__title">
            {title}
          </h1>
          {subtitle ? <p className="auth__subtitle">{subtitle}</p> : null}
        </header>
        {children}
      </section>
    </main>
  );
}
