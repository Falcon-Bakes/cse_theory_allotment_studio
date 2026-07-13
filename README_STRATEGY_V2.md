# V1.4.1 Strategy Engine V2

This package is a low-risk update to the deployed V1.4 codebase.

## New URL

`/hod/strategy-v2`

The existing `/hod/strategy` page remains available as a fallback.

## Main additions

- Sticky light-blue header while scrolling vertically.
- Horizontal scroll to view Institute, Subject, P1–P6 and Progress.
- Checkbox = one section.
- `+` increases the same faculty to two or more sections.
- `−` reduces the section quantity.
- Course total can never exceed available section capacity.
- Cumulative workload updates using `hours_per_week × section_count`.
- Timetable export expands quantities into individual section rows.

## Safe deployment

Read `docs/STRATEGY_V2_UPGRADE.md` before deployment. Use a Vercel Preview and Neon staging branch first.
