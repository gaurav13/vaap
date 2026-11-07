ALTER TABLE news ADD COLUMN IF NOT EXISTS "sourceType" text NOT NULL DEFAULT 'original';
ALTER TABLE news ADD COLUMN IF NOT EXISTS "originalPublishedAt" timestamp;
UPDATE news SET "sourceType" = 'external'
  WHERE "sourceType" = 'original' AND "externalUrl" IS NOT NULL AND "externalUrl" <> '';
