CREATE TABLE IF NOT EXISTS media_highlights (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'Video',
  image text,
  url text,
  duration text NOT NULL DEFAULT '',
  featured boolean NOT NULL DEFAULT false,
  "sortOrder" serial,
  published boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
