-- Limited-time membership discounts managed by Super Admins.
CREATE TABLE IF NOT EXISTS membership_promotions (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  "planIds" integer[] NOT NULL DEFAULT '{}',
  "discountType" text NOT NULL DEFAULT 'percent',
  "discountValue" integer NOT NULL,
  "startsAt" timestamptz NOT NULL,
  "endsAt" timestamptz NOT NULL,
  "timeZone" text NOT NULL DEFAULT 'Asia/Karachi',
  "showCountdown" boolean NOT NULL DEFAULT true,
  "showBadge" boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  "expiredLoggedAt" timestamptz,
  "createdBy" text,
  "updatedBy" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membership_promotions_window CHECK ("endsAt" > "startsAt"),
  CONSTRAINT membership_promotions_type CHECK ("discountType" IN ('percent', 'fixed')),
  CONSTRAINT membership_promotions_value CHECK ("discountValue" > 0),
  CONSTRAINT membership_promotions_status CHECK (status IN ('draft', 'published', 'paused', 'ended'))
);

CREATE INDEX IF NOT EXISTS membership_promotions_live_idx
  ON membership_promotions (status, "startsAt", "endsAt");

-- Price actually agreed at checkout, so later promotion changes never rewrite it.
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS "promotionId" integer;
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS "promotionName" text;
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS "discountAmount" integer;

-- New membership display order.
UPDATE membership_plans SET "sortOrder" = 10 WHERE id = 4; -- Verified Crypto & Digital Asset Holder
UPDATE membership_plans SET "sortOrder" = 20 WHERE id = 5; -- Professional
UPDATE membership_plans SET "sortOrder" = 30 WHERE id = 3; -- Startup
UPDATE membership_plans SET "sortOrder" = 40 WHERE id = 2; -- Associate
UPDATE membership_plans SET "sortOrder" = 50 WHERE id = 1; -- Corporate
