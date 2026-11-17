-- Newsletter + custom email campaigns: richer content, audience groups, history.
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'newsletter';
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS subheading text NOT NULL DEFAULT '';
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS blocks jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS footer_html text NOT NULL DEFAULT '';
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS cta_color text;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS is_marketing boolean NOT NULL DEFAULT true;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS template_id integer;
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS sent_by_name text NOT NULL DEFAULT '';
ALTER TABLE newsletter_campaigns ADD COLUMN IF NOT EXISTS audience_summary jsonb;
CREATE INDEX IF NOT EXISTS newsletter_campaigns_kind ON newsletter_campaigns (kind);

ALTER TABLE newsletter_recipients ADD COLUMN IF NOT EXISTS segment_label text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS custom_email_templates (
  id serial PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  preview_text text NOT NULL DEFAULT '',
  subheading text NOT NULL DEFAULT '',
  banner_url text,
  body_html text NOT NULL DEFAULT '',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta_label text,
  cta_url text,
  cta_color text,
  footer_html text NOT NULL DEFAULT '',
  is_marketing boolean NOT NULL DEFAULT true,
  audience jsonb NOT NULL DEFAULT '{"groups":[]}'::jsonb,
  created_by_name text NOT NULL DEFAULT '',
  updated_by_name text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  deleted_at timestamp
);
