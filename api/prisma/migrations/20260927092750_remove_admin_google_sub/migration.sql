/*
  Warnings:

  - You are about to drop the column `google_sub` on the `admin_users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "admin_users_google_sub_key";

-- AlterTable
ALTER TABLE "admin_users" DROP COLUMN "google_sub";
