"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, className, ...input }, ref) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={`field${error ? " field--invalid" : ""}${className ? ` ${className}` : ""}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className="field__input"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...input}
      />
      {error ? (
        <p id={errorId} className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
