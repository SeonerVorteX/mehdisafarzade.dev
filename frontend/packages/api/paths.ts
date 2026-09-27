/** Public API paths, relative to `API_URL` (which already includes `/v1`). Mirrors test/__snapshots__/contract.e2e-spec.ts.snap. */
export const apiPaths = {
  health: "/health",
  profile: "/profile",
  projects: "/projects",
  project: (slug: string) => `/projects/${encodeURIComponent(slug)}`,
  experience: "/experience",
  education: "/education",
  skills: "/skills",
  posts: "/posts",
  post: (slug: string) => `/posts/${encodeURIComponent(slug)}`,
  tags: "/tags",
  page: (slug: string) => `/pages/${encodeURIComponent(slug)}`,
  media: (id: string, variant: string) => `/media/${encodeURIComponent(id)}/${encodeURIComponent(variant)}`,
  preview: {
    post: (id: string) => `/preview/posts/${encodeURIComponent(id)}`,
    project: (id: string) => `/preview/projects/${encodeURIComponent(id)}`,
    page: (id: string) => `/preview/pages/${encodeURIComponent(id)}`,
  },
} as const;

/**
 * Next.js cache tags. They are the API's content-cache tags, so the revalidation
 * webhook can pass them through unchanged (`post:<id>` etc. for single items).
 */
export const cacheTags = {
  profile: "profile",
  projects: "projects",
  experience: "experience",
  education: "education",
  skills: "skills",
  posts: "posts",
  tags: "tags",
  pages: "pages",
  post: (id: string) => `post:${id}`,
  project: (id: string) => `project:${id}`,
  page: (id: string) => `page:${id}`,
} as const;
