# Developer Guide

## Common minor changes

### App title
Edit `app/layout.tsx`, navigation labels and `README.md`.

### Workbench columns
Edit `components/StrategyWorkbench.tsx`. Keep the course-key and faculty-id values unchanged.

### Workload calculation
See `strategyWorkbenchData()` in `lib/store.ts`. Workload equals the sum of `hours_per_week` in the active draft run.

### Section capacity
See `toggleStrategyAssignment()` in `lib/store.ts`. Capacity equals grouped `faculty_needed`; remaining candidates are disabled when filled.

### Export columns
Edit `timetableFriendlyCSV()` in `lib/store.ts` and the export route.

### Styling
Edit the V1.4 block at the end of `app/globals.css`.

## Rules that must not be weakened

- HoD role check on every workbench API.
- Unique faculty/course assignment within a run.
- Course selection count cannot exceed available section slots.
- Existing preferences are read-only.
- Production reset/seed must never be used as an upgrade mechanism.
