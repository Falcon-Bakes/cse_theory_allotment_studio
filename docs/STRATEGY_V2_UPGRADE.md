# Strategy Engine V2 — Minimum-Difficulty Upgrade

This release adds `/hod/strategy-v2` in parallel with the deployed `/hod/strategy` page.

## Production-safe changes

- Existing Faculty, Course, Preference and Settings tables are not changed.
- Existing Strategy page remains available.
- One additive column is introduced: `allotment_assignments.section_count`, default `1`.
- Existing assignment rows automatically remain valid as one-section assignments.

## Deployment

1. Take a Neon backup/branch.
2. Deploy this branch to a Vercel Preview URL.
3. Run `npm run db:setup` against the staging database.
4. Test `/hod/strategy-v2`.
5. Confirm old `/hod/strategy` still works.
6. Merge to production only after approval.
7. Initially share only the `/hod/strategy-v2` URL with HoD/Admin.

## V2 behavior

- Fixed light-blue table header during vertical scrolling.
- Horizontal scrollbar exposes Institute, Subject, P1–P6 and Progress.
- Checkbox = one section allotment.
- Checkbox + one `+` click = two sections.
- Checkbox + two `+` clicks = three sections.
- `−` reduces quantity; quantity 0 removes the assignment.
- The total quantity in a course can never exceed course capacity.
- Timetable export expands quantity into one row per section.
