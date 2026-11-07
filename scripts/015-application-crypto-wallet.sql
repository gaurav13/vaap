ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS "cryptoCoin" text;
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS "cryptoAddress" text;
