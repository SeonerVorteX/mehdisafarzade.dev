import type { AbstractIntlMessages } from "next-intl";

/**
 * Namespaces used by client components in the shared shell (ThemeToggle, LanguageSwitcher).
 * Everything else is rendered on the server, so its strings never reach the browser.
 * A page with its own client islands wraps them in a nested provider with extra namespaces.
 */
export const SHELL_CLIENT_NAMESPACES = ["theme", "language"] as const;

export function pickMessages(messages: AbstractIntlMessages, namespaces: readonly string[]): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};
  for (const n of namespaces) {
    const value = messages[n];
    if (value !== undefined) picked[n] = value;
  }
  return picked;
}
