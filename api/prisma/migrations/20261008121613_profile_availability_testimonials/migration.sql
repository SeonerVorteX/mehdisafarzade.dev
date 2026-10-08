/*
  Warnings:

  - You are about to drop the column `available_for_work` on the `site_profile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "testimonial_source" AS ENUM ('UPWORK', 'LINKEDIN');

-- AlterEnum
ALTER TYPE "skill_category" ADD VALUE 'AI';

-- AlterTable
ALTER TABLE "site_profile" DROP COLUMN "available_for_work",
ADD COLUMN     "available_for_freelance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "available_for_roles" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "quote_locale" "locale" NOT NULL DEFAULT 'en',
    "author_name" TEXT,
    "source" "testimonial_source" NOT NULL,
    "period" TEXT,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonial_translations" (
    "id" TEXT NOT NULL,
    "testimonial_id" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "author_label" TEXT NOT NULL,
    "quote_translation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonial_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "testimonials_key_key" ON "testimonials"("key");

-- CreateIndex
CREATE INDEX "testimonials_status_order_idx" ON "testimonials"("status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "testimonial_translations_testimonial_id_locale_key" ON "testimonial_translations"("testimonial_id", "locale");

-- AddForeignKey
ALTER TABLE "testimonial_translations" ADD CONSTRAINT "testimonial_translations_testimonial_id_fkey" FOREIGN KEY ("testimonial_id") REFERENCES "testimonials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
