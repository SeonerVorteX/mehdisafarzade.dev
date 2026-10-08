"use client";

import { useState, type FormEvent } from "react";

/**
 * Design-review forms don't send anything (the contact pipeline is Phase 8). Submitting
 * validates natively, then flips to the "sent" state so the confirmation design can be judged.
 */
export function useDemoSend(): [sent: boolean, onSubmit: (e: FormEvent<HTMLFormElement>) => void, reset: () => void] {
  const [sent, setSent] = useState(false);
  return [
    sent,
    (e) => {
      e.preventDefault();
      setSent(true);
    },
    () => setSent(false),
  ];
}
