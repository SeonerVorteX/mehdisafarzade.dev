"use client";

import { Check } from "lucide-react";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { useDemoSend } from "../_shared/useDemoSend";
import s from "./b.module.scss";

/**
 * A lattice window. The pointer is the light source behind the glass: its position feeds
 * --lx/--ly, and the CSS brightens whichever pane it shines through. Pure pointer response,
 * no autonomous motion, so it stays on under reduced motion.
 */
export function Window({
  children,
  className,
  label,
  light = false,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  /** Only the hero window is lit: the page's one authored effect. */
  light?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--lx", `${e.clientX - r.left}px`);
    el.style.setProperty("--ly", `${e.clientY - r.top}px`);
    el.dataset.lit = "";
  };
  const onLeave = () => {
    if (ref.current) delete ref.current.dataset.lit;
  };
  return (
    <div
      ref={ref}
      className={`${s.window} ${className ?? ""}`}
      onPointerMove={light ? onMove : undefined}
      onPointerLeave={light ? onLeave : undefined}
      role={label ? "group" : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}

type StarterLabels = { label: string; placeholder: string; email: string; send: string; sent: string };

export function StarterB({ labels }: { labels: StarterLabels }) {
  const [sent, onSubmit] = useDemoSend();
  if (sent) {
    return (
      <p className={s.sent} role="status">
        <Check aria-hidden size={20} strokeWidth={2.25} />
        {labels.sent}
      </p>
    );
  }
  return (
    <form className={s.starter} onSubmit={onSubmit}>
      <label className={s.field}>
        <span className={s.paneTitle}>{labels.label}</span>
        <textarea className={s.inputOnGlass} name="brief" rows={2} required placeholder={labels.placeholder} />
      </label>
      <div className={s.starterRow}>
        <label className={s.field}>
          <span className={s.fieldLabelOnGlass}>{labels.email}</span>
          <input className={s.inputOnGlass} name="email" type="email" required autoComplete="email" />
        </label>
        <button className={s.buttonOnGlass} type="submit">
          {labels.send}
        </button>
      </div>
    </form>
  );
}

type ContactLabels = { name: string; email: string; message: string; send: string; sent: string };

export function ContactB({ labels }: { labels: ContactLabels }) {
  const [sent, onSubmit] = useDemoSend();
  if (sent) {
    return (
      <p className={s.sent} role="status">
        <Check aria-hidden size={20} strokeWidth={2.25} />
        {labels.sent}
      </p>
    );
  }
  return (
    <form className={s.contactForm} onSubmit={onSubmit}>
      <label className={s.field}>
        <span className={s.fieldLabelOnGlass}>{labels.name}</span>
        <input className={s.inputOnGlass} name="name" required autoComplete="name" />
      </label>
      <label className={s.field}>
        <span className={s.fieldLabelOnGlass}>{labels.email}</span>
        <input className={s.inputOnGlass} name="email" type="email" required autoComplete="email" />
      </label>
      <label className={`${s.field} ${s.fieldWide}`}>
        <span className={s.fieldLabelOnGlass}>{labels.message}</span>
        <textarea className={s.inputOnGlass} name="message" rows={5} required />
      </label>
      <button className={s.buttonOnGlass} type="submit">
        {labels.send}
      </button>
    </form>
  );
}
