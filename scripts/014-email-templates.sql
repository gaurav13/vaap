-- Admin-managed email templates. A row only exists once a template has been
-- edited; until then the code defaults in lib/email-templates/registry.ts are
-- used, so existing email triggers keep working unchanged.
CREATE TABLE IF NOT EXISTS email_templates (
  key text PRIMARY KEY,
  published_content jsonb,
  published_version integer NOT NULL DEFAULT 0,
  published_at timestamp,
  published_by text,
  draft_content jsonb,
  draft_updated_at timestamp,
  draft_updated_by text,
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_template_versions (
  id serial PRIMARY KEY,
  template_key text NOT NULL,
  version integer NOT NULL,
  content jsonb NOT NULL,
  published_by text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_template_versions_key_idx
  ON email_template_versions (template_key, version DESC);

CREATE TABLE IF NOT EXISTS email_logs (
  id serial PRIMARY KEY,
  template_key text,
  recipient text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  error text,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_logs_created_idx ON email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_template_idx ON email_logs (template_key, created_at DESC);
