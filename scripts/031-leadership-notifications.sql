-- Per-application delivery status for leadership notification emails
-- ({ received|approved|rejected: { status, at, attempts, recipient, error? } }).
alter table leadership add column if not exists "notifications" jsonb;
