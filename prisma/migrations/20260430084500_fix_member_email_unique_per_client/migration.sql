-- Fix multi-tenancy bug: email was globally unique, but the same
-- person should be able to hold memberships at different merchants.
-- Replace the single-column unique index with a composite one
-- so uniqueness is enforced per client, not across the whole table.

-- Drop the old global unique index on email
DROP INDEX "Member_email_key";

-- Add the new composite unique index on (clientId, email)
CREATE UNIQUE INDEX "Member_clientId_email_key" ON "Member"("clientId", "email");
