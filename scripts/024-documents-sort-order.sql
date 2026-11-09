-- Admin-controlled ordering for governance documents.
-- Backfill preserves the current display order (newest first).
ALTER TABLE documents ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" DESC, id DESC) - 1 AS pos
  FROM documents
)
UPDATE documents d
SET "sortOrder" = ranked.pos
FROM ranked
WHERE d.id = ranked.id
  AND NOT EXISTS (SELECT 1 FROM documents WHERE "sortOrder" <> 0);
