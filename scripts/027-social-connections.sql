ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS "credentials" text NOT NULL DEFAULT '';
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS "connectionStatus" text NOT NULL DEFAULT 'not_connected';
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS "accountName" text NOT NULL DEFAULT '';
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS "lastError" text NOT NULL DEFAULT '';
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS "lastCheckedAt" timestamp;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS "publishErrors" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS "imageAdjust" jsonb NOT NULL DEFAULT '{}'::jsonb;
