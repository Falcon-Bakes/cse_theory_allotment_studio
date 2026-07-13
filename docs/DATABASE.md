# Database Guide

## Existing V1.3 tables

- `faculty_master`
- `course_master`
- `preferences`
- `app_settings`

## V1.4 additive tables

- `preference_snapshots`: immutable copies of preference data for an allotment cycle.
- `allotment_runs`: Draft/Frozen/Archived workbench sessions.
- `allotment_assignments`: selected faculty for grouped courses.
- `allotment_audit_log`: assignment and unassignment history.

The migration is in `scripts/migrations/v1_4_additive.sql`.

## FK constraints

`allotment_assignments.faculty_id → faculty_master.faculty_id`

`allotment_assignments.run_id → allotment_runs.run_id`

`allotment_runs.snapshot_id → preference_snapshots.snapshot_id`

## Safety

Never run Admin Reset or delete master data on production. Take a Neon branch/backup before migration.
