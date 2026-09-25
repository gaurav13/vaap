-- 010-proposal-documents-discussion.sql
-- Supporting documents (uploaded by super admins) and member discussion for proposals. Idempotent.

CREATE TABLE IF NOT EXISTS governance_proposal_documents (
  id serial PRIMARY KEY,
  "proposalId" integer NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  "fileUrl" text NOT NULL,
  "fileName" text NOT NULL DEFAULT '',
  "fileType" text NOT NULL DEFAULT '',
  "fileSize" integer NOT NULL DEFAULT 0,
  "uploadedById" text,
  "uploadedByName" text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS governance_proposal_documents_proposal_idx
  ON governance_proposal_documents ("proposalId");

CREATE TABLE IF NOT EXISTS governance_proposal_comments (
  id serial PRIMARY KEY,
  "proposalId" integer NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
  "userId" text,
  "memberId" integer,
  "authorName" text NOT NULL DEFAULT '',
  "authorRole" text NOT NULL DEFAULT 'member',
  body text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS governance_proposal_comments_proposal_idx
  ON governance_proposal_comments ("proposalId", "createdAt");
