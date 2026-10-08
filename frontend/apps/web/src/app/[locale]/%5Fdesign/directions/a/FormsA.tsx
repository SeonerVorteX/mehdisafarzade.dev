"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { useDemoSend } from "../_shared/useDemoSend";
import s from "./a.module.scss";

type StarterLabels = { label: string; placeholder: string; email: string; send: string; sent: string };

/** The route's terminus: a one-line project brief + email, the hero's working action. */
export function StarterA({ labels, next }: { labels: StarterLabels; next: string }) {
  const [sent, onSubmit] = useDemoSend();
  const id = useId();
  return (
    <form className={s.starter} onSubmit={onSubmit} aria-labelledby={`${id}-t`}>
      <p className={s.starterNext} id={`${id}-t`}>
        {next}
      </p>
      {sent ? (
        <p className={s.sent} role="status">
          <Check aria-hidden size={18} strokeWidth={2} />
          {labels.sent}
        </p>
      ) : (
        <div className={s.starterRow}>
          <label className={s.field}>
            <span className={s.fieldLabel}>{labels.label}</span>
            <input className={s.input} name="brief" required placeholder={labels.placeholder} autoComplete="off" />
          </label>
          <label className={s.field}>
            <span className={s.fieldLabel}>{labels.email}</span>
            <input className={s.input} name="email" type="email" required autoComplete="email" />
          </label>
          <button className={s.primary} type="submit">
            {labels.send}
          </button>
        </div>
      )}
    </form>
  );
}

type ContactLabels = { name: string; email: string; message: string; send: string; sent: string };

export function ContactA({ labels }: { labels: ContactLabels }) {
  const [sent, onSubmit] = useDemoSend();
  if (sent) {
    return (
      <p className={s.sent} role="status">
        <Check aria-hidden size={18} strokeWidth={2} />
        {labels.sent}
      </p>
    );
  }
  return (
    <form className={s.contactForm} onSubmit={onSubmit}>
      <label className={s.field}>
        <span className={s.fieldLabel}>{labels.name}</span>
        <input className={s.input} name="name" required autoComplete="name" />
      </label>
      <label className={s.field}>
        <span className={s.fieldLabel}>{labels.email}</span>
        <input className={s.input} name="email" type="email" required autoComplete="email" />
      </label>
      <label className={`${s.field} ${s.fieldWide}`}>
        <span className={s.fieldLabel}>{labels.message}</span>
        <textarea className={s.input} name="message" rows={5} required />
      </label>
      <button className={s.primary} type="submit">
        {labels.send}
      </button>
    </form>
  );
}
