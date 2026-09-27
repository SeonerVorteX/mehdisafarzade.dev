import type { ReactNode } from "react";

/** Oversized section numeral + mono micro-label + display title (PLAN §7 layout). */
export function SectionHeading({
  index,
  label,
  title,
  id,
}: {
  index: number;
  label: string;
  title: ReactNode;
  id?: string;
}) {
  return (
    <header className="section-heading">
      <span className="section-heading__numeral" aria-hidden>
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <p className="micro-label">{label}</p>
        <h2 className="section-heading__title" id={id}>
          {title}
        </h2>
      </div>
    </header>
  );
}
