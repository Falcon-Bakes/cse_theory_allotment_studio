# Troubleshooting

## DATABASE_URL missing
Create `.env.local` with `DATABASE_URL` and `AUTH_SECRET`.

## V1.4 table does not exist
Run `npm run db:setup`. It is idempotent.

## Checkbox returns Unauthorized
Login with the dedicated HoD/Admin account and verify its role includes `HoD` or `Admin`.

## Course is already filled
Untick an assigned faculty or verify `faculty_needed`/section rows in Course Master.

## Workload appears wrong
Check `hours_per_week` in Course Master. V1.4 sums this field for every assignment.

## Do not use
Do not run `npm audit fix --force` or Admin Reset on the production deployment.
