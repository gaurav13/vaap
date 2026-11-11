-- Replies sent from the admin inbox to contact-form inquiries.
CREATE TABLE IF NOT EXISTS contact_message_replies (
  id serial PRIMARY KEY,
  "messageId" integer NOT NULL REFERENCES contact_messages(id) ON DELETE CASCADE,
  body text NOT NULL,
  "sentById" text,
  "sentByName" text,
  "emailStatus" text NOT NULL DEFAULT 'sent',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_message_replies_message_idx ON contact_message_replies ("messageId");
