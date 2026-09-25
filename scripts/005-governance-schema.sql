-- ============================================================
-- VAAP Governance, Elections & XRPL Verification System
-- ------------------------------------------------------------
-- Idempotent. Safe to re-run. Builds on the existing members /
-- user / audit tables (see 001..004). One member + one proposal
-- = one ACTIVE final vote is enforced at the DB level via partial
-- unique indexes, not just in application code (spec Part 32).
-- XRPL is TESTNET only until explicitly enabled otherwise.
-- ============================================================

-- ---- Public governance identifiers ------------------------
-- A stable public-facing ID per member for the public voting
-- register ("Search Member / Governance ID").
CREATE TABLE IF NOT EXISTS governance_public_ids (
  id serial PRIMARY KEY,
  "memberId" integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  "publicId" text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS governance_public_ids_member_idx
  ON governance_public_ids ("memberId");

-- ---- Per-member governance permissions (RBAC extension) ---
CREATE TABLE IF NOT EXISTS governance_member_permissions (
  id serial PRIMARY KEY,
  "memberId" integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  "canPropose" boolean NOT NULL DEFAULT false,
  "canVote" boolean NOT NULL DEFAULT true,
  "isElectionOfficer" boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS governance_member_permissions_member_idx
  ON governance_member_permissions ("memberId");

-- ---- Proposals (DAO governance / resolutions) -------------
CREATE TABLE IF NOT EXISTS governance_proposals (
  id serial PRIMARY KEY,
  reference text UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Resolution',
  -- yes_no_abstain | single_choice | multi_choice
  "voteType" text NOT NULL DEFAULT 'yes_no_abstain',
  -- open  = individual votes visible in the public register
  -- secret = only participation is public, choice hidden
  visibility text NOT NULL DEFAULT 'open',
  -- all_voting_members | selected_members | category
  "eligibilityMode" text NOT NULL DEFAULT 'all_voting_members',
  "eligibleCategory" text NOT NULL DEFAULT '',
  quorum integer NOT NULL DEFAULT 0,
  "passThreshold" integer NOT NULL DEFAULT 50,
  "recordIndividualVotesOnXrpl" boolean NOT NULL DEFAULT false,
  "anchorResultOnXrpl" boolean NOT NULL DEFAULT true,
  -- draft | published | active | closed | archived
  status text NOT NULL DEFAULT 'draft',
  "opensAt" timestamp,
  "closesAt" timestamp,
  "publishedAt" timestamp,
  "closedAt" timestamp,
  "createdById" text,
  "createdByName" text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS governance_proposals_status_idx
  ON governance_proposals (status);

-- ---- Proposal options (single / multi choice) -------------
CREATE TABLE IF NOT EXISTS governance_proposal_options (
  id serial PRIMARY KEY,
  "proposalId" integer NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
  label text NOT NULL,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS governance_proposal_options_proposal_idx
  ON governance_proposal_options ("proposalId");

-- ---- Proposal eligibility (explicit selected members) -----
CREATE TABLE IF NOT EXISTS governance_proposal_eligibility (
  id serial PRIMARY KEY,
  "proposalId" integer NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
  "memberId" integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS governance_proposal_eligibility_uniq
  ON governance_proposal_eligibility ("proposalId", "memberId");

-- ---- Votes (one ACTIVE final vote per member per proposal) -
CREATE TABLE IF NOT EXISTS governance_votes (
  id serial PRIMARY KEY,
  "proposalId" integer NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
  "memberId" integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  -- yes | no | abstain (for yes_no_abstain) or 'option'
  choice text NOT NULL,
  "optionId" integer REFERENCES governance_proposal_options(id) ON DELETE SET NULL,
  weight integer NOT NULL DEFAULT 1,
  "receiptCode" text NOT NULL UNIQUE,
  "isActive" boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  -- not_recorded | pending | verified | failed
  "xrplStatus" text NOT NULL DEFAULT 'not_recorded',
  "castAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS governance_votes_one_active
  ON governance_votes ("proposalId", "memberId") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS governance_votes_proposal_idx
  ON governance_votes ("proposalId");

-- ---- Vote history (superseded versions, append-only) ------
CREATE TABLE IF NOT EXISTS governance_vote_versions (
  id serial PRIMARY KEY,
  "voteId" integer NOT NULL REFERENCES governance_votes(id) ON DELETE CASCADE,
  "proposalId" integer NOT NULL,
  "memberId" integer NOT NULL,
  choice text NOT NULL,
  "optionId" integer,
  version integer NOT NULL,
  "supersededAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS governance_vote_versions_vote_idx
  ON governance_vote_versions ("voteId");

-- ---- Vote receipts (secure, verifiable) -------------------
CREATE TABLE IF NOT EXISTS governance_vote_receipts (
  id serial PRIMARY KEY,
  "voteId" integer NOT NULL REFERENCES governance_votes(id) ON DELETE CASCADE,
  "proposalId" integer NOT NULL,
  "memberId" integer NOT NULL,
  "receiptCode" text NOT NULL UNIQUE,
  "receiptHash" text NOT NULL,
  "issuedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS governance_vote_receipts_proposal_idx
  ON governance_vote_receipts ("proposalId");

-- ---- Elections (formal, secret ballot) --------------------
CREATE TABLE IF NOT EXISTS elections (
  id serial PRIMARY KEY,
  reference text UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  -- all_voting_members | selected_members | category
  "eligibilityMode" text NOT NULL DEFAULT 'all_voting_members',
  "eligibleCategory" text NOT NULL DEFAULT '',
  -- draft | published | active | closed | results_published | archived
  status text NOT NULL DEFAULT 'draft',
  "opensAt" timestamp,
  "closesAt" timestamp,
  "snapshotAt" timestamp,
  "anchorResultOnXrpl" boolean NOT NULL DEFAULT true,
  "createdById" text,
  "createdByName" text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- ---- Election positions (seats to fill) -------------------
CREATE TABLE IF NOT EXISTS election_positions (
  id serial PRIMARY KEY,
  "electionId" integer NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  seats integer NOT NULL DEFAULT 1,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS election_positions_election_idx
  ON election_positions ("electionId");

-- ---- Election candidates ----------------------------------
CREATE TABLE IF NOT EXISTS election_candidates (
  id serial PRIMARY KEY,
  "electionId" integer NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  "positionId" integer NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
  "memberId" integer REFERENCES members(id) ON DELETE SET NULL,
  name text NOT NULL,
  organization text NOT NULL DEFAULT '',
  manifesto text NOT NULL DEFAULT '',
  photo text,
  "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS election_candidates_position_idx
  ON election_candidates ("positionId");

-- ---- Voter snapshot (frozen eligibility at open) ----------
CREATE TABLE IF NOT EXISTS election_voter_snapshots (
  id serial PRIMARY KEY,
  "electionId" integer NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  "memberId" integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  "membershipId" text NOT NULL DEFAULT '',
  "memberName" text NOT NULL DEFAULT '',
  "publicId" text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS election_voter_snapshots_uniq
  ON election_voter_snapshots ("electionId", "memberId");

-- ---- Participation (who voted; not linked to selection) ---
CREATE TABLE IF NOT EXISTS election_participation (
  id serial PRIMARY KEY,
  "electionId" integer NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  "memberId" integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  "participatedAt" timestamp NOT NULL DEFAULT now(),
  -- not_recorded | pending | verified | failed
  "xrplStatus" text NOT NULL DEFAULT 'not_recorded',
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS election_participation_uniq
  ON election_participation ("electionId", "memberId");

-- ---- Secret ballots ---------------------------------------
-- No plaintext memberId: a keyed HMAC "voterTag" links a member
-- to (at most) one active ballot for re-voting and double-vote
-- prevention, without letting an admin casually connect identity
-- to candidate selection (spec: secret ballot). Selections are
-- stored encrypted.
CREATE TABLE IF NOT EXISTS election_ballots (
  id serial PRIMARY KEY,
  "electionId" integer NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  "voterTag" text NOT NULL,
  "ballotToken" text NOT NULL UNIQUE,
  "encryptedSelections" text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  "castAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS election_ballots_one_active
  ON election_ballots ("electionId", "voterTag") WHERE "isActive" = true;

-- ---- Ballot history (superseded encrypted ballots) --------
CREATE TABLE IF NOT EXISTS election_ballot_versions (
  id serial PRIMARY KEY,
  "ballotId" integer NOT NULL REFERENCES election_ballots(id) ON DELETE CASCADE,
  "electionId" integer NOT NULL,
  "encryptedSelections" text NOT NULL,
  version integer NOT NULL,
  "supersededAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS election_ballot_versions_ballot_idx
  ON election_ballot_versions ("ballotId");

-- ---- Election results (per candidate tally) ---------------
CREATE TABLE IF NOT EXISTS election_results (
  id serial PRIMARY KEY,
  "electionId" integer NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  "positionId" integer NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
  "candidateId" integer NOT NULL REFERENCES election_candidates(id) ON DELETE CASCADE,
  votes integer NOT NULL DEFAULT 0,
  "isWinner" boolean NOT NULL DEFAULT false,
  "resultHash" text,
  "computedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS election_results_election_idx
  ON election_results ("electionId");

-- ---- Governance results (proposal tally + outcome) --------
CREATE TABLE IF NOT EXISTS governance_results (
  id serial PRIMARY KEY,
  "proposalId" integer NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
  "eligibleCount" integer NOT NULL DEFAULT 0,
  "totalVotes" integer NOT NULL DEFAULT 0,
  "yesCount" integer NOT NULL DEFAULT 0,
  "noCount" integer NOT NULL DEFAULT 0,
  "abstainCount" integer NOT NULL DEFAULT 0,
  "optionTally" text NOT NULL DEFAULT '',
  -- pending | passed | failed | no_quorum
  outcome text NOT NULL DEFAULT 'pending',
  "resultHash" text,
  "computedAt" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS governance_results_proposal_idx
  ON governance_results ("proposalId");

-- ---- XRPL transaction queue -------------------------------
CREATE TABLE IF NOT EXISTS xrpl_transaction_queue (
  id serial PRIMARY KEY,
  -- vote | election_participation | result_anchor
  "jobType" text NOT NULL,
  "refTable" text NOT NULL,
  "refId" integer NOT NULL,
  "payloadHash" text NOT NULL,
  payload text NOT NULL DEFAULT '',
  -- pending | processing | submitted | verified | failed
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  "maxAttempts" integer NOT NULL DEFAULT 5,
  "lastError" text NOT NULL DEFAULT '',
  "idempotencyKey" text NOT NULL UNIQUE,
  "nextRunAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xrpl_queue_status_idx
  ON xrpl_transaction_queue (status, "nextRunAt");

-- ---- XRPL transactions (submitted / validated) ------------
CREATE TABLE IF NOT EXISTS xrpl_transactions (
  id serial PRIMARY KEY,
  "queueId" integer REFERENCES xrpl_transaction_queue(id) ON DELETE SET NULL,
  "jobType" text NOT NULL,
  "refTable" text NOT NULL,
  "refId" integer NOT NULL,
  network text NOT NULL DEFAULT 'testnet',
  "txHash" text UNIQUE,
  "ledgerIndex" integer,
  account text NOT NULL DEFAULT '',
  "memoHash" text NOT NULL DEFAULT '',
  -- pending | submitted | verified | failed
  status text NOT NULL DEFAULT 'pending',
  "validatedAt" timestamp,
  "rawResult" text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xrpl_transactions_ref_idx
  ON xrpl_transactions ("refTable", "refId");

-- ---- XRPL anchors (final result hash on ledger) -----------
CREATE TABLE IF NOT EXISTS xrpl_anchors (
  id serial PRIMARY KEY,
  -- proposal_result | election_result
  "anchorType" text NOT NULL,
  "refId" integer NOT NULL,
  "resultHash" text NOT NULL,
  "txHash" text,
  network text NOT NULL DEFAULT 'testnet',
  -- pending | submitted | verified | failed
  status text NOT NULL DEFAULT 'pending',
  "anchoredAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xrpl_anchors_ref_idx
  ON xrpl_anchors ("anchorType", "refId");

-- ---- Governance audit log (append-only) -------------------
CREATE TABLE IF NOT EXISTS governance_audit_logs (
  id serial PRIMARY KEY,
  "actorId" text,
  "actorName" text NOT NULL DEFAULT '',
  "actorRole" text NOT NULL DEFAULT '',
  action text NOT NULL,
  "entityType" text NOT NULL DEFAULT '',
  "entityId" text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  "ipAddress" text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS governance_audit_logs_entity_idx
  ON governance_audit_logs ("entityType", "entityId");
