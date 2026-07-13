# CSE Theory Allotment Studio V1.3 — Vercel Deployment Guide

This is the **Web Deploy Edition**. It uses **PostgreSQL** instead of the local JSON database, so it is suitable for Vercel.

## 1. Create Neon PostgreSQL database

1. Go to Neon and create a free PostgreSQL project.
2. Copy the connection string.
3. It should look like:

```text
postgresql://USER:PASSWORD@HOST/dbname?sslmode=require
```

## 2. Push project to GitHub

```bash
git init
git add .
git commit -m "CSE Theory Allotment Studio V1.3 Web Deploy"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## 3. Initialize database locally once

On the student's laptop, inside the project folder:

```bash
npm install
```

Create `.env.local` from `.env.example` and paste the Neon connection string:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST/dbname?sslmode=require
AUTH_SECRET=some-long-random-secret
```

Then run:

```bash
npm run db:setup
```

This creates the tables and loads the seed data.

Default accounts after seed:

```text
User ID: hod
Password: hod

User ID: shivanagowda
Password: shivanagowda
```

Both will ask for password reset on first login.

## 4. Deploy on Vercel

1. Go to Vercel.
2. Add New Project.
3. Import the GitHub repository.
4. Framework should be detected as Next.js.
5. Add environment variables:

```text
DATABASE_URL = same Neon connection string
AUTH_SECRET = same long random secret
```

6. Click Deploy.

## 5. Test after deployment

Open the Vercel URL and test:

```text
/hod login: hod / hod
/faculty login: shivanagowda / shivanagowda
```

After password reset, verify:

- Admin settings page
- Faculty/course master import
- Faculty preference submission
- HoD tabs
- Faculty Preferences export
- Sample allotment actions

## Important notes

- Do not use local JSON data on Vercel.
- Do not run `npm audit fix --force` unless you intentionally want to upgrade dependencies.
- If database is empty, run `npm run db:setup` again with the correct `DATABASE_URL`.
- Admin can reset seed data from the Admin page after login.
