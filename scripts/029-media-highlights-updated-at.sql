ALTER TABLE media_highlights ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();
UPDATE media_highlights SET "updatedAt" = "createdAt" WHERE "updatedAt" > "createdAt" AND "updatedAt" >= now() - interval '1 minute';
CREATE INDEX IF NOT EXISTS media_highlights_recent_idx ON media_highlights (published, "updatedAt" DESC);
