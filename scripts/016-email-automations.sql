-- Email automation control panel, compliance and newsletter review.

CREATE TABLE IF NOT EXISTS email_automations (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMP,
  last_sent_at TIMESTAMP,
  total_sent INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_automation_runs (
  id SERIAL PRIMARY KEY,
  automation_key TEXT NOT NULL,
  trigger TEXT NOT NULL,          -- cron | manual | event | individual
  sent INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS email_automation_runs_key_idx ON email_automation_runs (automation_key, started_at DESC);

-- One row per delivered automation email; the unique key prevents duplicates.
CREATE TABLE IF NOT EXISTS email_sends (
  id SERIAL PRIMARY KEY,
  automation_key TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  recipient TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_sends_automation_idx ON email_sends (automation_key, created_at DESC);

-- Unsubscribes and admin suppressions. topic = an automation key or 'all'.
CREATE TABLE IF NOT EXISTS email_suppressions (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'unsubscribed',
  source TEXT NOT NULL DEFAULT 'recipient',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (email, topic)
);

CREATE TABLE IF NOT EXISTS newsletter_issues (
  id SERIAL PRIMARY KEY,
  week_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | sending | sent
  content JSONB NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMP,
  updated_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
