-- Invitation codes gate invite-only membership categories (Academic & Research).
-- Government & Public Institution memberships are enrolled by admins only.
CREATE TABLE IF NOT EXISTS membership_invitation_codes (
  "id" serial PRIMARY KEY,
  "code" text NOT NULL,
  "label" text NOT NULL DEFAULT '',
  "maxUses" integer,
  "usedCount" integer NOT NULL DEFAULT 0,
  "expiresAt" timestamp,
  "active" boolean NOT NULL DEFAULT true,
  "createdBy" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS membership_invitation_codes_code_idx
  ON membership_invitation_codes (upper("code"));

ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS "invitationCode" text;
