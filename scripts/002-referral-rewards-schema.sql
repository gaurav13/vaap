-- Staff, Committee, Referral & Rewards system
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS staff_profiles (
  id serial PRIMARY KEY,
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  position text NOT NULL DEFAULT '',
  "committeeId" integer,
  "isCommitteeHead" boolean NOT NULL DEFAULT false,
  bio text NOT NULL DEFAULT '',
  photo text,
  phone text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id serial PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL,
  category text NOT NULL DEFAULT 'Insight',
  image text,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  tags text NOT NULL DEFAULT '',
  "authorId" text,
  "authorName" text NOT NULL DEFAULT '',
  "authorRole" text NOT NULL DEFAULT '',
  "committeeId" integer,
  "seoTitle" text NOT NULL DEFAULT '',
  "seoDescription" text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  "publishedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS article_approvals (
  id serial PRIMARY KEY,
  "articleId" integer NOT NULL,
  "reviewerId" text,
  "reviewerName" text NOT NULL DEFAULT '',
  decision text NOT NULL,
  note text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_campaigns (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  "startsAt" timestamp,
  "endsAt" timestamp,
  "eligibleCategories" text NOT NULL DEFAULT '',
  "eligibleRoles" text NOT NULL DEFAULT '',
  "maxReferrals" integer,
  "maxReward" integer,
  status text NOT NULL DEFAULT 'draft',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_partners (
  id serial PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'KOL',
  email text NOT NULL,
  "userId" text,
  "campaignId" integer,
  status text NOT NULL DEFAULT 'active',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_codes (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  "ownerUserId" text,
  "partnerId" integer,
  "campaignId" integer,
  "eligibleCategories" text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  "expiresAt" timestamp,
  "maxUses" integer,
  uses integer NOT NULL DEFAULT 0,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_clicks (
  id serial PRIMARY KEY,
  "codeId" integer,
  code text NOT NULL,
  referer text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_attributions (
  id serial PRIMARY KEY,
  code text NOT NULL,
  "codeId" integer,
  "referrerUserId" text,
  "partnerId" integer,
  "campaignId" integer,
  "applicationId" integer,
  "memberEmail" text NOT NULL DEFAULT '',
  "membershipId" text,
  status text NOT NULL DEFAULT 'application_submitted',
  locked boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_rules (
  id serial PRIMARY KEY,
  name text NOT NULL,
  "referrerRole" text NOT NULL DEFAULT '',
  "membershipCategory" text NOT NULL DEFAULT '',
  "campaignId" integer,
  "rewardType" text NOT NULL DEFAULT 'percentage',
  "commissionPercent" text NOT NULL DEFAULT '0',
  "fixedAmount" integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  "commissionableFees" text NOT NULL DEFAULT 'annual',
  "minPayment" integer NOT NULL DEFAULT 0,
  "rewardTrigger" text NOT NULL DEFAULT 'membership_approved',
  "effectiveFrom" timestamp,
  "effectiveUntil" timestamp,
  status text NOT NULL DEFAULT 'draft',
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_transactions (
  id serial PRIMARY KEY,
  "attributionId" integer,
  "referrerUserId" text,
  "partnerId" integer,
  "referrerName" text NOT NULL DEFAULT '',
  "referrerRole" text NOT NULL DEFAULT '',
  "memberEmail" text NOT NULL DEFAULT '',
  "memberName" text NOT NULL DEFAULT '',
  "membershipId" text,
  "membershipCategory" text NOT NULL DEFAULT '',
  "eligibleAmount" integer NOT NULL DEFAULT 0,
  "commissionRate" text NOT NULL DEFAULT '',
  "rewardAmount" integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  "ruleId" integer,
  "ruleSnapshot" text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'eligible',
  note text NOT NULL DEFAULT '',
  "approvedById" text,
  "approvedByName" text NOT NULL DEFAULT '',
  "approvedAt" timestamp,
  "batchId" integer,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_adjustments (
  id serial PRIMARY KEY,
  "rewardId" integer NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  "adminId" text,
  "adminName" text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_batches (
  id serial PRIMARY KEY,
  name text NOT NULL,
  period text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  "createdById" text,
  "createdByName" text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_payments (
  id serial PRIMARY KEY,
  "batchId" integer,
  "rewardId" integer,
  "recipientUserId" text,
  "partnerId" integer,
  "recipientName" text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  gross integer NOT NULL DEFAULT 0,
  adjustments integer NOT NULL DEFAULT 0,
  "finalAmount" integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  method text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  "userId" text,
  role text,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attr_referrer ON referral_attributions ("referrerUserId");
CREATE INDEX IF NOT EXISTS idx_attr_partner ON referral_attributions ("partnerId");
CREATE INDEX IF NOT EXISTS idx_attr_email ON referral_attributions ("memberEmail");
CREATE INDEX IF NOT EXISTS idx_reward_referrer ON reward_transactions ("referrerUserId");
CREATE INDEX IF NOT EXISTS idx_reward_partner ON reward_transactions ("partnerId");
CREATE INDEX IF NOT EXISTS idx_reward_status ON reward_transactions (status);
CREATE INDEX IF NOT EXISTS idx_codes_owner ON referral_codes ("ownerUserId");
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_attr_application ON referral_attributions ("applicationId") WHERE "applicationId" IS NOT NULL;
