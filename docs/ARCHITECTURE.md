# Architecture

## Request flow

Browser → Next.js page/API route → `lib/store.ts` → PostgreSQL/Neon.

## Main areas

- `app/faculty/`: faculty preference UI.
- `app/hod/`: demand and faculty preference dashboards.
- `app/hod/strategy/`: V1.4 interactive allotment workbench.
- `app/admin/`: faculty, course and settings administration.
- `app/api/`: server-side write and export endpoints.
- `components/StrategyWorkbench.tsx`: client-side live allotment UI.
- `lib/auth.ts`: sessions, password hashing and role checks.
- `lib/store.ts`: database access and domain rules.
- `scripts/setup-postgres.mjs`: idempotent database initialization.

## Design rule

Preferences are historical input. Allotments are stored separately. The V1.4 workbench must never update or delete preferences.
