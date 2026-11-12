-- Leadership application, AI profile and approval workflow (extends the existing table).
alter table leadership add column if not exists "slug" text;
alter table leadership add column if not exists "title" text not null default '';
alter table leadership add column if not exists "summary" text not null default '';
alter table leadership add column if not exists "portfolio" text not null default '';
alter table leadership add column if not exists "message" text not null default '';
alter table leadership add column if not exists "status" text not null default 'approved';
alter table leadership add column if not exists "contactEmail" text;
alter table leadership add column if not exists "contactPhone" text;
alter table leadership add column if not exists "applicantUserId" text;
alter table leadership add column if not exists "submission" jsonb;
alter table leadership add column if not exists "draft" jsonb;
alter table leadership add column if not exists "reviewNote" text not null default '';
alter table leadership add column if not exists "submittedAt" timestamp;
alter table leadership add column if not exists "reviewedAt" timestamp;
alter table leadership add column if not exists "reviewedBy" text;
alter table leadership add column if not exists "updatedAt" timestamp not null default now();

-- Backfill clean slugs for existing profiles (numeric suffix on collisions).
with base as (
  select id, coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'profile') as s
  from leadership where slug is null
), ranked as (
  select id, s, row_number() over (partition by s order by id) as n from base
)
update leadership l
set slug = case when r.n = 1 and not exists (select 1 from leadership o where o.slug = r.s) then r.s else r.s || '-' || l.id end
from ranked r where r.id = l.id;

create unique index if not exists leadership_slug_idx on leadership (slug);
create index if not exists leadership_status_idx on leadership (status);

create table if not exists leadership_revisions (
  id serial primary key,
  "leadershipId" integer not null,
  action text not null,
  "actorId" text,
  "actorName" text not null default '',
  note text not null default '',
  snapshot jsonb,
  "createdAt" timestamp not null default now()
);
create index if not exists leadership_revisions_leader_idx on leadership_revisions ("leadershipId");
