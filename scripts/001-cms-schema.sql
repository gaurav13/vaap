ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS "inquiryType" text NOT NULL DEFAULT 'General Inquiry';

CREATE TABLE IF NOT EXISTS pages (
  id serial PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL,
  "parentSlug" text,
  "heroTitle" text NOT NULL DEFAULT '',
  "heroSubtitle" text NOT NULL DEFAULT '',
  "heroImage" text,
  content text NOT NULL DEFAULT '',
  "seoTitle" text NOT NULL DEFAULT '',
  "metaDescription" text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  "sortOrder" serial,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publications (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Research',
  "coverImage" text,
  "pdfUrl" text,
  "membersOnly" boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id serial PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Governance Policies',
  description text NOT NULL DEFAULT '',
  "fileUrl" text,
  published boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leadership (
  id serial PRIMARY KEY,
  name text NOT NULL,
  position text NOT NULL DEFAULT '',
  organization text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  photo text,
  linkedin text,
  responsibility text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'committee',
  featured boolean NOT NULL DEFAULT false,
  "sortOrder" serial,
  published boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS committees (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  "sortOrder" serial,
  published boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partners (
  id serial PRIMARY KEY,
  name text NOT NULL,
  logo text,
  url text,
  "sortOrder" serial,
  published boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS official_status (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  "documentUrl" text,
  "documentLabel" text NOT NULL DEFAULT 'View official document',
  "sortOrder" serial,
  published boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id serial PRIMARY KEY,
  "userId" text REFERENCES "user"(id) ON DELETE SET NULL,
  "membershipId" text NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  organization text,
  category text NOT NULL DEFAULT 'Verified Community Members',
  status text NOT NULL DEFAULT 'active',
  "votingEligible" boolean NOT NULL DEFAULT false,
  "goodStanding" boolean NOT NULL DEFAULT true,
  "joinedAt" timestamp NOT NULL DEFAULT now(),
  "expiresAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  "actorId" text,
  "actorName" text NOT NULL DEFAULT '',
  action text NOT NULL,
  target text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);
