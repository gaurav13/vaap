-- Two independent voting permissions layered onto the existing
-- governance_member_permissions table:
--   electionStatus    -> formal VAAP election voting right
--   governanceStatus  -> governance / project / DAO voting right
-- Each has its own lifecycle: pending | approved | rejected | suspended | revoked
-- plus who/when/why metadata for the audit trail. Idempotent.

ALTER TABLE governance_member_permissions
  ADD COLUMN IF NOT EXISTS "electionStatus"        text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "governanceStatus"      text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "electionApprovedBy"    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "electionApprovedAt"    timestamp,
  ADD COLUMN IF NOT EXISTS "electionReason"        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "governanceApprovedBy"  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "governanceApprovedAt"  timestamp,
  ADD COLUMN IF NOT EXISTS "governanceReason"      text NOT NULL DEFAULT '';

-- Ensure every current member has a permissions row, seeding both voting
-- statuses from the legacy votingEligible flag so existing eligible voters
-- keep their access and everyone else starts as PENDING (super-admin approval).
INSERT INTO governance_member_permissions
  ("memberId", "canPropose", "canVote", "isElectionOfficer", "note", "electionStatus", "governanceStatus")
SELECT
  m.id, false, true, false, '',
  CASE WHEN m."votingEligible" THEN 'approved' ELSE 'pending' END,
  CASE WHEN m."votingEligible" THEN 'approved' ELSE 'pending' END
FROM members m
WHERE NOT EXISTS (
  SELECT 1 FROM governance_member_permissions p WHERE p."memberId" = m.id
);

-- For pre-existing permission rows, promote to APPROVED where the member was
-- already flagged voting-eligible (preserves current behaviour on first deploy).
UPDATE governance_member_permissions p
SET "electionStatus"   = 'approved',
    "governanceStatus" = 'approved'
FROM members m
WHERE p."memberId" = m.id AND m."votingEligible" = true
  AND (p."electionStatus" = 'pending' OR p."governanceStatus" = 'pending');

CREATE INDEX IF NOT EXISTS idx_gmp_election_status ON governance_member_permissions ("electionStatus");
CREATE INDEX IF NOT EXISTS idx_gmp_governance_status ON governance_member_permissions ("governanceStatus");
