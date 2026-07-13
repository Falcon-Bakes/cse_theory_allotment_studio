import { sql } from '@vercel/postgres';
await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
await sql`CREATE TABLE IF NOT EXISTS faculty_master(
 faculty_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), faculty_name text NOT NULL, user_id text UNIQUE NOT NULL, password_hash text NOT NULL,
 designation text, department text DEFAULT 'CSE', home_institution text DEFAULT 'GMU', role text DEFAULT 'Faculty', seniority_level text,
 expertise_area text, max_theory_load numeric DEFAULT 12, profile_url text, photo_url text, is_active boolean DEFAULT true,
 must_reset_password boolean DEFAULT true, last_login_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`;
await sql`CREATE TABLE IF NOT EXISTS course_master(
 course_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), academic_year text DEFAULT '2026-27', term text DEFAULT 'Odd', institution text NOT NULL,
 department text DEFAULT 'CSE', semester int NOT NULL, section text NOT NULL, short_code text, course_code text NOT NULL, course_name text NOT NULL,
 course_type text DEFAULT 'Theory', l int DEFAULT 3, t int DEFAULT 0, p int DEFAULT 0, theory_load numeric DEFAULT 3, faculty_needed int DEFAULT 1, course_group text, remarks text,
 UNIQUE(institution,semester,section,course_code))`;
await sql`CREATE TABLE IF NOT EXISTS preferences(
 preference_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), faculty_id uuid NOT NULL REFERENCES faculty_master(faculty_id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES course_master(course_id) ON DELETE CASCADE, preference_rank int NOT NULL CHECK(preference_rank BETWEEN 1 AND 10), teaching_intent text,
 submitted_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), UNIQUE(faculty_id,preference_rank), UNIQUE(faculty_id,course_id))`;
await sql`CREATE TABLE IF NOT EXISTS allotments(
 allotment_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), option_name text NOT NULL, faculty_id uuid NOT NULL REFERENCES faculty_master(faculty_id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES course_master(course_id) ON DELETE CASCADE, preference_rank_received int, workload numeric, allotment_status text DEFAULT 'Draft', hod_remarks text,
 created_at timestamptz DEFAULT now(), UNIQUE(option_name,course_id,faculty_id))`;
await sql`CREATE TABLE IF NOT EXISTS app_settings(setting_key text PRIMARY KEY, setting_value text, updated_at timestamptz DEFAULT now())`;
console.log('Database initialized');
