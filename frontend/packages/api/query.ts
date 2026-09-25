/** React Query defaults, copied from `@examination/api/query.ts`. */
export const BASE_QUERY_DEFAULTS = {
  queries: {
    retry: 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  },
  mutations: {
    retry: 0,
  },
} as const;
