-- Add onboarding fields to Client and ClientConfig
--
-- Client.slug: added in three steps because existing rows cannot receive
-- a NOT NULL column with no value. We add it as nullable, backfill every
-- existing row with its own id (guaranteed unique), then enforce NOT NULL.
--
-- ClientConfig.welcomeBonus and birthdayBonus: safe to add directly because
-- both have DEFAULT values — existing rows are filled automatically.

-- Step 1: add slug as nullable so existing rows are not blocked
ALTER TABLE "Client" ADD COLUMN "slug" TEXT;

-- Step 2: backfill existing rows — use each row's id as its slug.
-- The id is a cuid string, which is unique by construction, so this
-- satisfies the upcoming UNIQUE constraint without any collisions.
UPDATE "Client" SET "slug" = "id" WHERE "slug" IS NULL;

-- Step 3: enforce NOT NULL now that every row has a value
ALTER TABLE "Client" ALTER COLUMN "slug" SET NOT NULL;

-- Step 4: add the unique index that backs @unique in the Prisma schema
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- Add welcomeBonus and birthdayBonus to ClientConfig.
-- DEFAULT values mean existing rows are populated automatically — no backfill needed.
ALTER TABLE "ClientConfig" ADD COLUMN "welcomeBonus" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClientConfig" ADD COLUMN "birthdayBonus" BOOLEAN NOT NULL DEFAULT false;
