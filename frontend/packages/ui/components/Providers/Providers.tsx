"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { BASE_QUERY_DEFAULTS } from "@portfolio/api";

/** React Query provider with the shared defaults (one client per browser tab). */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: BASE_QUERY_DEFAULTS }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
