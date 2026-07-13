-- V1.4 additive migration. Safe for the existing V1.3 production database.
-- It creates new allotment workbench tables only. Existing preferences are not changed.
create table if not exists preference_snapshots (
  snapshot_id text primary key,
  snapshot_name text not null,
  created_by text not null,
  created_at timestamptz default now(),
  faculty_count integer default 0,
  preference_count integer default 0,
  snapshot_json jsonb not null
);

create table if not exists allotment_runs (
  run_id text primary key,
  run_name text not null,
  snapshot_id text references preference_snapshots(snapshot_id),
  status text not null default 'Draft' check(status in ('Draft','Frozen','Archived')),
  created_by text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists allotment_assignments (
  assignment_id text primary key,
  run_id text not null references allotment_runs(run_id) on delete cascade,
  course_key text not null,
  faculty_id text not null references faculty_master(faculty_id),
  preference_rank integer check(preference_rank between 1 and 6),
  hours_per_week numeric not null default 0,
  section_name text,
  section_count integer not null default 1,
  created_by text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(run_id, course_key, faculty_id)
);

create table if not exists allotment_audit_log (
  audit_id text primary key,
  run_id text,
  action text not null,
  faculty_id text,
  course_key text,
  details_json jsonb,
  performed_by text not null,
  performed_at timestamptz default now()
);

create index if not exists idx_allotment_assignments_run on allotment_assignments(run_id);
create index if not exists idx_allotment_assignments_faculty on allotment_assignments(faculty_id);
create index if not exists idx_allotment_assignments_course on allotment_assignments(course_key);

-- V1.4.1 Strategy V2 additive compatibility
alter table allotment_assignments add column if not exists section_count integer not null default 1;
