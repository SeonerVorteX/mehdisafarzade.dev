"use client";

import { Send } from "lucide-react";
import { useId } from "react";
import { useDemoSend } from "../_shared/useDemoSend";
import s from "./c.module.scss";

/** A circular postmark: real data (where a letter came from, and when), set as type on a ring. */
export function Postmark({ top, bottom, className }: { top: string; bottom?: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className={`${s.postmark} ${className ?? ""}`} aria-hidden>
      <defs>
        <path id={`${id}-top`} d="M 16 50 A 34 34 0 0 1 84 50" />
        <path id={`${id}-bot`} d="M 12 50 A 38 38 0 0 0 88 50" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text className={s.postmarkText}>
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      {bottom && (
        <text className={s.postmarkText}>
          <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">
            {bottom}
          </textPath>
        </text>
      )}
      <path d="M 34 50 H 66 M 38 44 H 62 M 38 56 H 62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

type EnvelopeLabels = {
  to: string;
  toValue: string;
  from: string;
  about: string;
  placeholder: string;
  send: string;
  sent: string;
  stamp: string;
  city: string;
  fromPlaceholder: string;
};

/**
 * The contact action as an envelope you address. Sending folds the flap shut and presses a
 * postmark: the page's one orchestrated motion, triggered by the visitor, skipped under reduced
 * motion.
 */
export function Envelope({ labels, wide = false }: { labels: EnvelopeLabels; wide?: boolean }) {
  const [sent, onSubmit] = useDemoSend();
  const id = useId();
  return (
    <form
      className={`${s.envelope} ${wide ? s.envelopeWide : ""}`}
      data-sent={sent || undefined}
      onSubmit={onSubmit}
      aria-labelledby={`${id}-to`}
    >
      <span className={s.flap} aria-hidden />
      <div className={s.stamp} aria-hidden>
        <span>{labels.stamp}</span>
      </div>
      <p className={s.addressTo} id={`${id}-to`}>
        <span className={s.addressLabel}>{labels.to}</span> {labels.toValue}
      </p>
      <label className={s.addressLine}>
        <span className={s.addressLabel}>{labels.from}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={labels.fromPlaceholder}
          disabled={sent}
        />
      </label>
      <label className={s.addressLine}>
        <span className={s.addressLabel}>{labels.about}</span>
        <textarea name="message" rows={wide ? 5 : 3} required placeholder={labels.placeholder} disabled={sent} />
      </label>
      {sent ? (
        <p className={s.sentNote} role="status">
          {labels.sent}
        </p>
      ) : (
        <button className={s.sendButton} type="submit">
          <Send aria-hidden size={18} strokeWidth={2.25} />
          {labels.send}
        </button>
      )}
      <span className={s.sentMark} aria-hidden>
        <Postmark top={labels.city} bottom={labels.stamp} />
      </span>
    </form>
  );
}
