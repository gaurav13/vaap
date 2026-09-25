-- 009-proposal-banner.sql
-- Banner image for governance proposals shown on the public website. Idempotent.

ALTER TABLE governance_proposals
  ADD COLUMN IF NOT EXISTS "bannerImageUrl" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "bannerAlt" text NOT NULL DEFAULT '';
