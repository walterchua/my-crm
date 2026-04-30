-- Remove tierPlatinum from ClientConfig — field was added in error,
-- it was not part of the original design.
ALTER TABLE "ClientConfig" DROP COLUMN "tierPlatinum";
