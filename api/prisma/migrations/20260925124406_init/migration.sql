-- CreateEnum
CREATE TYPE "locale" AS ENUM ('az', 'en', 'ru');

-- CreateEnum
CREATE TYPE "post_status" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "message_status" AS ENUM ('NEW', 'READ', 'ARCHIVED', 'SPAM');

-- CreateEnum
CREATE TYPE "media_status" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "skill_category" AS ENUM ('LANGUAGE', 'FRAMEWORK', 'DATA', 'CLOUD_DEVOPS', 'TOOLING', 'SOFT');

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER NOT NULL,
    "lqip" TEXT,
    "variants" JSONB NOT NULL DEFAULT '{}',
    "status" "media_status" NOT NULL DEFAULT 'PENDING',
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_translations" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "status" "post_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "cover_media_id" TEXT,
    "author_id" TEXT,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_translations" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "body_markdown" TEXT NOT NULL DEFAULT '',
    "reading_time_min" INTEGER NOT NULL DEFAULT 1,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_translations" (
    "id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tag_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "post_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "repo_url" TEXT,
    "live_url" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "cover_media_id" TEXT,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_translations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "case_study_markdown" TEXT NOT NULL DEFAULT '',
    "role" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_skills" (
    "project_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_skills_pkey" PRIMARY KEY ("project_id","skill_id")
);

-- CreateTable
CREATE TABLE "project_media" (
    "project_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_media_pkey" PRIMARY KEY ("project_id","media_id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "skill_category" NOT NULL,
    "level" INTEGER,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "org" TEXT NOT NULL,
    "org_url" TEXT,
    "location" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_translations" (
    "id" TEXT NOT NULL,
    "experience_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "bullets_markdown" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "url" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_translations" (
    "id" TEXT NOT NULL,
    "education_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "degree" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_profile" (
    "id" TEXT NOT NULL DEFAULT 'profile',
    "email" TEXT NOT NULL,
    "socials" JSONB NOT NULL DEFAULT '{}',
    "available_for_work" BOOLEAN NOT NULL DEFAULT false,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_profile_translations" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "pitch" TEXT NOT NULL DEFAULT '',
    "bio_markdown" TEXT NOT NULL DEFAULT '',
    "seo_title" TEXT,
    "seo_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_profile_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_resumes" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "media_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_translations" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "body_markdown" TEXT NOT NULL DEFAULT '',
    "seo_title" TEXT,
    "seo_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "project_type" TEXT,
    "budget" TEXT,
    "locale" "locale" NOT NULL,
    "status" "message_status" NOT NULL DEFAULT 'NEW',
    "ip_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "replied_at" TIMESTAMP(3),
    "notified_at" TIMESTAMP(3),
    "auto_reply_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "totp_secret_enc" TEXT,
    "totp_enabled_at" TIMESTAMP(3),
    "google_sub" TEXT,
    "last_login_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_recovery_codes" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "refresh_hash" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_id" TEXT,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "device_name" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_s3_key_key" ON "media"("s3_key");

-- CreateIndex
CREATE UNIQUE INDEX "media_translations_media_id_locale_key" ON "media_translations"("media_id", "locale");

-- CreateIndex
CREATE INDEX "posts_status_published_at_idx" ON "posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "posts_status_scheduled_at_idx" ON "posts"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "post_translations_post_id_locale_key" ON "post_translations"("post_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "post_translations_locale_slug_key" ON "post_translations"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "tag_translations_tag_id_locale_key" ON "tag_translations"("tag_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "tag_translations_locale_slug_key" ON "tag_translations"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_order_idx" ON "projects"("status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "project_translations_project_id_locale_key" ON "project_translations"("project_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "skills_key_key" ON "skills"("key");

-- CreateIndex
CREATE UNIQUE INDEX "experience_key_key" ON "experience"("key");

-- CreateIndex
CREATE UNIQUE INDEX "experience_translations_experience_id_locale_key" ON "experience_translations"("experience_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "education_key_key" ON "education"("key");

-- CreateIndex
CREATE UNIQUE INDEX "education_translations_education_id_locale_key" ON "education_translations"("education_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "site_profile_translations_profile_id_locale_key" ON "site_profile_translations"("profile_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "profile_resumes_profile_id_locale_key" ON "profile_resumes"("profile_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "pages_key_key" ON "pages"("key");

-- CreateIndex
CREATE UNIQUE INDEX "page_translations_page_id_locale_key" ON "page_translations"("page_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "page_translations_locale_slug_key" ON "page_translations"("locale", "slug");

-- CreateIndex
CREATE INDEX "contact_messages_status_created_at_idx" ON "contact_messages"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_google_sub_key" ON "admin_users"("google_sub");

-- CreateIndex
CREATE INDEX "admin_recovery_codes_admin_id_idx" ON "admin_recovery_codes"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_refresh_hash_key" ON "admin_sessions"("refresh_hash");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_replaced_by_id_key" ON "admin_sessions"("replaced_by_id");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "admin_sessions_family_id_idx" ON "admin_sessions"("family_id");

-- CreateIndex
CREATE INDEX "audit_logs_at_idx" ON "audit_logs"("at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_translations" ADD CONSTRAINT "media_translations_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_translations" ADD CONSTRAINT "tag_translations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_translations" ADD CONSTRAINT "project_translations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_translations" ADD CONSTRAINT "experience_translations_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_translations" ADD CONSTRAINT "education_translations_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "education"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_profile_translations" ADD CONSTRAINT "site_profile_translations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "site_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_resumes" ADD CONSTRAINT "profile_resumes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "site_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_resumes" ADD CONSTRAINT "profile_resumes_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_recovery_codes" ADD CONSTRAINT "admin_recovery_codes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "admin_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
