-- Verified KOL (Key Opinion Leader) profiles. Each profile belongs to an
-- existing member record — there is no separate KOL account.
CREATE TABLE IF NOT EXISTS kol_profiles (
  id SERIAL PRIMARY KEY,
  "memberId" INTEGER NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  "fullName" TEXT NOT NULL DEFAULT '',
  "professionalName" TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Pakistan',
  city TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  expertise JSONB NOT NULL DEFAULT '[]'::jsonb,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  "monthlyReach" INTEGER NOT NULL DEFAULT 0,
  "mediaAppearances" TEXT NOT NULL DEFAULT '',
  collaborations TEXT NOT NULL DEFAULT '',
  achievements TEXT NOT NULL DEFAULT '',
  "collabInterests" TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  "evidenceNotes" TEXT NOT NULL DEFAULT '',
  "identityVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "metricsVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "adminNote" TEXT NOT NULL DEFAULT '',
  "invitedAt" TIMESTAMP,
  "submittedAt" TIMESTAMP,
  "verifiedAt" TIMESTAMP,
  "expiresAt" TIMESTAMP,
  "reminderSentAt" TIMESTAMP,
  "statsUpdatedAt" TIMESTAMP,
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kol_profiles_status_idx ON kol_profiles (status);

CREATE TABLE IF NOT EXISTS kol_audit_log (
  id SERIAL PRIMARY KEY,
  "memberId" INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kol_audit_log_member_idx ON kol_audit_log ("memberId");
