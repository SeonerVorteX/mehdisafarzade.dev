import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import type { APIErrorItem } from "./fetcher";

type Translate = (key: string) => string;

/** Replaces `intl:<key>` tokens (sent by the fetcher for client-side errors) with translated text. */
export function translateIntlTokens(message: string, t?: Translate): string {
  if (!t || !message.includes("intl:")) return message;
  return message
    .split(" ")
    .map((seg) => (seg.startsWith("intl:") ? t(seg.slice("intl:".length)) : seg))
    .join(" ");
}

/** Maps API validation/domain errors onto react-hook-form fields, falling back to `root`. */
export function applyApiErrorsToForm<TFieldValues extends FieldValues>(
  items: APIErrorItem[],
  setError: UseFormSetError<TFieldValues>,
  t?: Translate,
) {
  for (const err of items) {
    const message = translateIntlTokens(err.message, t);
    const fields = err.field ? [err.field] : err.fields ? ([] as string[]).concat(err.fields) : [];
    if (!fields.length) {
      setError("root", { type: err.code, message });
      continue;
    }
    for (const f of fields) setError(f as FieldPath<TFieldValues>, { type: err.code, message });
  }
}
