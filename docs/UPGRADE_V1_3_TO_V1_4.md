# Safe Upgrade: V1.3 → V1.4

1. Export faculty master, course master, preferences and settings.
2. Create a Neon branch or database backup.
3. Deploy V1.4 to a Vercel Preview environment using the staging database.
4. Run `npm run db:setup`. It adds V1.4 tables and does not seed when faculty data already exists.
5. Compare preference counts and faculty/course totals with production.
6. Test `/hod/strategy`, checkbox capacity, cumulative load and export.
7. Merge to `main` only after acceptance testing.
8. Keep the prior Vercel deployment available for rollback.

Do not run the Admin Reset endpoint on production.
