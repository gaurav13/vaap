-- Allow a staff/team member to belong to more than one committee.
-- Adds an integer[] column and backfills it from the existing single committeeId.

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS "committeeIds" integer[] NOT NULL DEFAULT '{}';

UPDATE staff_profiles
  SET "committeeIds" = ARRAY["committeeId"]
  WHERE "committeeId" IS NOT NULL
    AND ("committeeIds" IS NULL OR "committeeIds" = '{}');
