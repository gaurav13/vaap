CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id serial PRIMARY KEY,
  application_id integer NOT NULL,
  member_id integer,
  provider text NOT NULL,
  payment_ref text NOT NULL UNIQUE,
  amount integer,
  currency text,
  payment_email text,
  paid_at timestamp,
  previous_txid text,
  note text NOT NULL DEFAULT '',
  actor_id text NOT NULL,
  actor_name text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_change_requests (
  id serial PRIMARY KEY,
  user_id text,
  application_id integer,
  old_email text NOT NULL,
  new_email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  confirmed_at timestamp,
  cancelled_at timestamp,
  requested_by text NOT NULL,
  requested_by_name text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id serial PRIMARY KEY,
  title text NOT NULL,
  subject text NOT NULL DEFAULT '',
  preview_text text NOT NULL DEFAULT '',
  banner_url text,
  body_html text NOT NULL DEFAULT '',
  cta_label text,
  cta_url text,
  audience jsonb NOT NULL DEFAULT '{"type":"all"}',
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamp,
  started_at timestamp,
  completed_at timestamp,
  total_recipients integer NOT NULL DEFAULT 0,
  created_by text,
  created_by_name text NOT NULL DEFAULT '',
  updated_by_name text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_recipients (
  id serial PRIMARY KEY,
  campaign_id integer NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  is_member boolean NOT NULL DEFAULT false,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamp,
  sent_at timestamp,
  opened_at timestamp,
  clicked_at timestamp,
  click_count integer NOT NULL DEFAULT 0,
  unsubscribed_at timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_recipients_campaign_email ON newsletter_recipients (campaign_id, email);
CREATE INDEX IF NOT EXISTS newsletter_recipients_status ON newsletter_recipients (status);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'admin',
  consent_note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'subscribed',
  created_at timestamp NOT NULL DEFAULT now()
);
