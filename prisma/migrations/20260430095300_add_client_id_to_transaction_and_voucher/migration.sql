-- Add clientId to Transaction and Voucher so client-scoped queries
-- (reports, exports, analytics) can filter directly on these tables
-- without joining through Member every time.
--
-- Why three steps per table instead of one ALTER TABLE ADD COLUMN NOT NULL:
--   1. Add the column as nullable — existing rows need a value first.
--   2. Backfill from Member — derive the correct clientId via memberId.
--   3. Set NOT NULL — safe now that every row has a value.
-- Skipping step 2 and going straight to NOT NULL would fail because
-- PostgreSQL enforces the constraint against the existing null rows immediately.

-- ── Transaction ──────────────────────────────────────────────────────────────

-- Step 1: add nullable column
ALTER TABLE "Transaction" ADD COLUMN "clientId" TEXT;

-- Step 2: backfill every existing row from the Member table
UPDATE "Transaction"
SET "clientId" = (
  SELECT "clientId"
  FROM   "Member"
  WHERE  "Member"."id" = "Transaction"."memberId"
);

-- Step 3: enforce NOT NULL now that all rows have a value
ALTER TABLE "Transaction" ALTER COLUMN "clientId" SET NOT NULL;

-- Step 4: add the foreign key to Client
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Voucher ───────────────────────────────────────────────────────────────────

ALTER TABLE "Voucher" ADD COLUMN "clientId" TEXT;

UPDATE "Voucher"
SET "clientId" = (
  SELECT "clientId"
  FROM   "Member"
  WHERE  "Member"."id" = "Voucher"."memberId"
);

ALTER TABLE "Voucher" ALTER COLUMN "clientId" SET NOT NULL;

ALTER TABLE "Voucher"
  ADD CONSTRAINT "Voucher_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
