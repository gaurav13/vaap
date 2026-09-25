-- 008-governance-public.sql
-- Public website governance experience: per-proposal visibility controls,
-- vote-change rule, and richer proposal detail fields. Idempotent.

ALTER TABLE governance_proposals
  ADD COLUMN IF NOT EXISTS "showLiveResults" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showIndividualVotesPublicly" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showMemberNumberPublicly" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowVoteChanges" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "background" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "objectives" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "expectedImpact" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "implementationPlan" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "timelineText" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "budget" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "committee" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "proposalOwner" text NOT NULL DEFAULT '';
