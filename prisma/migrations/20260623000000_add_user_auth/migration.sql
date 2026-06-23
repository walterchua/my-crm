-- Create the User table for admin authentication.
-- This is a brand new table with no existing data, so no backfill is needed.
-- Passwords are stored as bcrypt hashes — the application never stores plain text.

CREATE TABLE "User" (
  "id"        TEXT        NOT NULL,
  "email"     TEXT        NOT NULL,
  "password"  TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "role"      TEXT        NOT NULL DEFAULT 'admin',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Unique index on email so two admins cannot share the same login
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
