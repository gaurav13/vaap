-- Governance key-value settings (e.g. the auto-provisioned XRPL testnet
-- governance wallet seed). Idempotent.
CREATE TABLE IF NOT EXISTS governance_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "createdAt" timestamp NOT NULL DEFAULT now()
);
