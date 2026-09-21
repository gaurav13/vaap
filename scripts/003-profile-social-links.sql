-- Adds social / SNS link columns to leadership and committee-head profiles
-- so each person can have a dedicated public profile page.

ALTER TABLE "leadership"
  ADD COLUMN IF NOT EXISTS "x" text,
  ADD COLUMN IF NOT EXISTS "facebook" text,
  ADD COLUMN IF NOT EXISTS "instagram" text,
  ADD COLUMN IF NOT EXISTS "website" text,
  ADD COLUMN IF NOT EXISTS "email" text;

ALTER TABLE "committees"
  ADD COLUMN IF NOT EXISTS "headX" text,
  ADD COLUMN IF NOT EXISTS "headFacebook" text,
  ADD COLUMN IF NOT EXISTS "headInstagram" text,
  ADD COLUMN IF NOT EXISTS "headWebsite" text,
  ADD COLUMN IF NOT EXISTS "headEmail" text;
