import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const { Pool } = pg;
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.log(process.env.DATABASE_URL);
  console.error("DATABASE_URL or POSTGRES_URL is required.");
  process.exit(1);
}
const pool = new Pool({
  connectionString: url,
  ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
});
const q = (text, params = []) => pool.query(text, params);
const seed = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "seed.json"), "utf8"),
);
await q(`
create table if not exists faculty_master (
  faculty_id text primary key,
  department text,
  faculty_name text not null,
  user_id text unique not null,
  password_hash text not null,
  designation text,
  role text not null default 'Faculty',
  seniority_level text,
  expertise_area text,
  home_institution text,
  max_theory_load numeric default 12,
  years_experience numeric default 0,
  must_reset_password boolean default true,
  is_active boolean default true,
  updated_at timestamptz default now()
);
create table if not exists course_master (
  course_id text primary key,
  department text,
  institution text,
  semester integer,
  section text,
  short_code text,
  course_code text,
  course_name text,
  course_group text,
  l numeric default 0,
  t numeric default 0,
  p numeric default 0,
  hours_per_week numeric default 0,
  credits numeric default 0,
  faculty_needed integer default 1,
  is_theory_course boolean default true,
  remarks text
);
create table if not exists preferences (
  preference_id text primary key,
  faculty_id text references faculty_master(faculty_id) on delete cascade,
  course_key text not null,
  preference_rank integer not null check(preference_rank between 1 and 6),
  teaching_intent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(faculty_id, preference_rank),
  unique(faculty_id, course_key)
);
create table if not exists app_settings (
  setting_key text primary key,
  setting_value text
);
`);
const count = await q("select count(*)::int as n from faculty_master");
if (count.rows[0].n === 0) {
  for (const f of seed.faculty_master) {
    await q(
      `insert into faculty_master(faculty_id,department,faculty_name,user_id,password_hash,designation,role,seniority_level,expertise_area,home_institution,max_theory_load,years_experience,must_reset_password,is_active) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        f.faculty_id,
        f.department,
        f.faculty_name,
        f.user_id,
        f.password_hash,
        f.designation,
        f.role,
        f.seniority_level,
        f.expertise_area,
        f.home_institution,
        f.max_theory_load,
        f.years_experience,
        f.must_reset_password,
        f.is_active,
      ],
    );
  }
  for (const c of seed.course_master) {
    await q(
      `insert into course_master(course_id,department,institution,semester,section,short_code,course_code,course_name,course_group,l,t,p,hours_per_week,credits,faculty_needed,is_theory_course,remarks) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        c.course_id,
        c.department,
        c.institution,
        c.semester,
        c.section,
        c.short_code,
        c.course_code,
        c.course_name,
        c.course_group,
        c.l,
        c.t,
        c.p,
        c.hours_per_week,
        c.credits,
        c.faculty_needed,
        c.is_theory_course,
        c.remarks,
      ],
    );
  }
  for (const [k, v] of Object.entries(seed.app_settings)) {
    await q(
      "insert into app_settings(setting_key,setting_value) values($1,$2)",
      [k, String(v)],
    );
  }
  console.log(
    `Database initialized with ${seed.faculty_master.length} faculty and ${seed.course_master.length} course offerings.`,
  );
} else {
  console.log(
    "Database already contains data. No seed inserted. Use Admin > Reset to reload seed data if needed.",
  );
}
// V1.4 additive schema. This block never deletes or reseeds production data.
await q(`
create table if not exists preference_snapshots (
 snapshot_id text primary key, snapshot_name text not null, created_by text not null,
 created_at timestamptz default now(), faculty_count integer default 0,
 preference_count integer default 0, snapshot_json jsonb not null
);
create table if not exists allotment_runs (
 run_id text primary key, run_name text not null,
 snapshot_id text references preference_snapshots(snapshot_id),
 status text not null default 'Draft', created_by text not null,
 created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists allotment_assignments (
 assignment_id text primary key, run_id text not null references allotment_runs(run_id) on delete cascade,
 course_key text not null, faculty_id text not null references faculty_master(faculty_id),
 preference_rank integer, hours_per_week numeric not null default 0, section_name text,
      section_count integer not null default 1,
 created_by text not null, created_at timestamptz default now(), updated_at timestamptz default now(),
 unique(run_id,course_key,faculty_id)
);
create table if not exists allotment_audit_log (
 audit_id text primary key, run_id text, action text not null, faculty_id text, course_key text,
 details_json jsonb, performed_by text not null, performed_at timestamptz default now()
);
create index if not exists idx_allotment_assignments_run on allotment_assignments(run_id);
create index if not exists idx_allotment_assignments_faculty on allotment_assignments(faculty_id);
create index if not exists idx_allotment_assignments_course on allotment_assignments(course_key);
`);
await q(`alter table allotment_assignments add column if not exists section_count integer not null default 1`);

await pool.end();

