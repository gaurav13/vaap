-- Membership invitation + reminder history for registered (unpaid) users.
-- Additive only: no existing table or row is modified.
CREATE TABLE IF NOT EXISTS membership_invitations (
  "id" serial PRIMARY KEY,
  "userId" text,
  "email" text NOT NULL,
  -- invitation | reminder-1 | reminder-2 | reminder-final | manual-reminder
  "stage" text NOT NULL,
  -- manual | bulk | automation
  "trigger" text NOT NULL,
  -- sent | failed | skipped
  "status" text NOT NULL,
  "error" text,
  "actor" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membership_invitations_email_idx ON membership_invitations (lower("email"));
CREATE INDEX IF NOT EXISTS membership_invitations_user_idx ON membership_invitations ("userId", "createdAt" DESC);
