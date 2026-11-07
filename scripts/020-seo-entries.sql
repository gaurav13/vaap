-- Page-level SEO overrides. One optional row per page or content item, keyed by
-- "<kind>:<id>" (e.g. "page:/about", "news:8", "event:12", "article:my-slug").
-- Content tables stay the source of truth; empty fields fall back to them.
CREATE TABLE IF NOT EXISTS seo_entries (
  "key" text PRIMARY KEY,
  "seoTitle" text NOT NULL DEFAULT '',
  "metaDescription" text NOT NULL DEFAULT '',
  "keywords" text NOT NULL DEFAULT '',
  "canonicalUrl" text NOT NULL DEFAULT '',
  "noindex" boolean NOT NULL DEFAULT false,
  "ogTitle" text NOT NULL DEFAULT '',
  "ogDescription" text NOT NULL DEFAULT '',
  "ogImage" text NOT NULL DEFAULT '',
  "twitterTitle" text NOT NULL DEFAULT '',
  "twitterDescription" text NOT NULL DEFAULT '',
  "twitterImage" text NOT NULL DEFAULT '',
  "customSchema" text NOT NULL DEFAULT '',
  "extra" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "published" boolean NOT NULL DEFAULT true,
  "updatedBy" text,
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
