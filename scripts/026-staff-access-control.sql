-- Staff vs Super Admin access control: richer audit trail, message workflow,
-- admin-verified payments, content revisions and homepage change requests.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "actorRole" text NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "entityType" text NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "entityId" text NOT NULL DEFAULT '';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS "details" text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs ("actorId");

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS "assignedToId" text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS "assignedToName" text NOT NULL DEFAULT '';
UPDATE contact_messages SET "status" = 'resolved' WHERE handled = true AND "status" = 'pending';

ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS "paymentVerifiedAt" timestamp;
ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS "paymentVerifiedBy" text;

CREATE TABLE IF NOT EXISTS content_revisions (
  id serial PRIMARY KEY,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  snapshot jsonb NOT NULL,
  action text NOT NULL DEFAULT 'update',
  "actorId" text,
  "actorName" text NOT NULL DEFAULT '',
  "actorRole" text NOT NULL DEFAULT '',
  "restoredAt" timestamp,
  "restoredBy" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_revisions_entity_idx ON content_revisions ("entityType", "entityId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS content_change_requests (
  id serial PRIMARY KEY,
  section text NOT NULL,
  title text NOT NULL,
  details text NOT NULL DEFAULT '',
  "proposedText" text NOT NULL DEFAULT '',
  "proposedImage" text,
  status text NOT NULL DEFAULT 'pending',
  "submittedById" text,
  "submittedByName" text NOT NULL DEFAULT '',
  "reviewedById" text,
  "reviewedByName" text NOT NULL DEFAULT '',
  "reviewNote" text NOT NULL DEFAULT '',
  "reviewedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
