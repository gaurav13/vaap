-- QR-verifiable membership certificates.
CREATE TABLE IF NOT EXISTS membership_certificates (
  id SERIAL PRIMARY KEY,
  "memberId" INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'issued',
  "issuedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP,
  "revokedAt" TIMESTAMP,
  "revokedReason" TEXT,
  "issuedBy" TEXT
);
CREATE INDEX IF NOT EXISTS membership_certificates_member_idx ON membership_certificates ("memberId");
