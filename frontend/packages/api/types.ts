/**
 * Request/response types shared with `api/` (hand-maintained, Examination style).
 * The API's route list is snapshotted in api/test/__snapshots__/contract.e2e-spec.ts.snap,
 * so a route change fails CI there; keep these shapes in step with the services.
 */
export type HealthResponse = { status: "ok"; timestamp: string };

export type Locale = "en" | "az" | "ru";

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

/** Every localized item says which locale it was served in; `fallback` = the requested one was missing (en shown). */
export type Localized = { locale: Locale; fallback: boolean };

/** Public media. Variants are `avif-480`, `webp-960`, … (images) or `original` (PDF); fetch via apiPaths.media. */
export type MediaView = {
  id: string;
  mime: string;
  width: number | null;
  height: number | null;
  lqip: string | null;
  alt: string;
  caption: string | null;
  variants: string[];
};

export type SkillCategory = "LANGUAGE" | "FRAMEWORK" | "DATA" | "CLOUD_DEVOPS" | "TOOLING" | "AI" | "SOFT";
export type Skill = {
  id: string;
  key: string;
  name: string;
  category: SkillCategory;
  level: number | null;
  icon: string | null;
  order: number;
  featured: boolean;
};
export type SkillRef = { key: string; name: string; category: SkillCategory };

export type SocialKey = "github" | "linkedin" | "upwork" | "x" | "telegram" | "stackoverflow";

export type Profile = Localized & {
  email: string;
  socials: Partial<Record<SocialKey, string>>;
  /** Each is shown subtly (near the contact CTA) only while on; managed in the admin. */
  availableForFreelance: boolean;
  availableForRoles: boolean;
  name: string;
  headline: string;
  pitch: string;
  bioMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
  /** Only for the requested locale (no cross-locale fallback). */
  resume: { mediaId: string; locale: Locale } | null;
  resumeLocales: Locale[];
};

export type ProjectSummary = Localized & {
  id: string;
  slug: string;
  featured: boolean;
  order: number;
  title: string;
  summary: string;
  role: string | null;
  repoUrl: string | null;
  liveUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
  cover: MediaView | null;
  skills: SkillRef[];
};
export type ProjectDetail = ProjectSummary & {
  caseStudyMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
  gallery: MediaView[];
  availableLocales: Locale[];
  updatedAt: string;
};

export type Experience = Localized & {
  id: string;
  org: string;
  orgUrl: string | null;
  location: string | null;
  startedAt: string;
  endedAt: string | null;
  current: boolean;
  title: string;
  summary: string;
  bulletsMarkdown: string;
};

export type Education = Localized & {
  id: string;
  institution: string;
  url: string | null;
  startedAt: string;
  endedAt: string | null;
  degree: string;
  summary: string;
};

export type TagView = { id: string; name: string; slug: string };
export type TagWithCount = TagView & { locale: Locale; count: number };

export type PostSummary = Localized & {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  readingTimeMin: number;
  publishedAt: string | null;
  featured: boolean;
  cover: MediaView | null;
  tags: TagView[];
};
export type PostLink = { id: string; slug: string; title: string };
export type PostDetail = PostSummary & {
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  bodyMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  /** Slug per locale that has a translation (for hreflang + the language switcher). */
  alternates: Partial<Record<Locale, string>>;
  availableLocales: Locale[];
  prev: PostLink | null;
  next: PostLink | null;
  related: PostSummary[];
};

export type CmsPage = Localized & {
  id: string;
  key: string;
  slug: string;
  title: string;
  bodyMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
  alternates: Partial<Record<Locale, string>>;
  availableLocales: Locale[];
  updatedAt: string;
};

export type PostsQuery = { locale?: Locale; page?: number; pageSize?: number; tag?: string; q?: string };
export type ProjectsQuery = { locale?: Locale; featured?: boolean; skill?: string };
