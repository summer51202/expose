# Railway Known Issues

This file records the real issues encountered while moving this project from local development to hosted Railway deployment.

Use this as a troubleshooting map.

---

## Issue 1: Build succeeds locally but hosted page fails at runtime

### Symptom
- Railway deploy shows success
- Opening the site shows a generic server error page

### Where to look
- Start with `Deploy Logs`
- Then check `HTTP Logs` for route-specific failures

### Why it happens
- A successful deploy only means build/start completed
- Runtime requests can still fail because of DB, env, auth, or storage issues

### Fix workflow
1. Open `Deploy Logs`
2. Refresh the failing page
3. Read the newest runtime error

---

## Issue 2: `The table main.Photo does not exist`

### Symptom
Railway logs show errors like:

```text
The table `main.Photo` does not exist
```

### Root cause
- `DATABASE_URL=file:/data/expose.db` points to a valid SQLite file path
- But the DB schema has not been created in that file yet
- The volume is mounted, but Prisma migrations were not applied

### Fix
Run Prisma migrations against the hosted volume:

```bash
npx prisma migrate deploy
```

Recommended permanent fix:

```bash
npx prisma migrate deploy && npm run start
```

### Important note
- This means the DB file exists
- It does not mean the content data exists
- It only means the Prisma schema was missing

---

## Issue 3: `Unable to open the database file`

### Symptom
Railway build/runtime logs show:

```text
Error code 14: Unable to open the database file
```

### Root cause
This project originally hit this in two different contexts:

#### Local Windows context
- SQLite inside the workspace was unstable on this machine
- `%TEMP%` path was more reliable for local dev

#### Railway hosted context
- Build phase tried to access `file:/data/expose.db`
- But Railway volumes are runtime-mounted, not build-mounted

### Fix
- Keep Railway DB path on the mounted volume:

```env
DATABASE_URL=file:/data/expose.db
```

- Do not depend on the volume during build
- Let DB access happen at runtime
- Run migrations at startup, not at build time

---

## Issue 4: Homepage build failed because it touched Prisma too early

### Symptom
- Railway build failed while prerendering `/`
- The homepage attempted to query Prisma during static generation

### Root cause
The homepage was being treated as a static route during build, but the SQLite database lives on a runtime-mounted volume.

### Fix applied
File:
- `src/app/(browse)/page.tsx`

Change:

```ts
export const dynamic = "force-dynamic";
```

### Why this works
- Prevents homepage DB access during build-time prerendering
- Defers data fetch to runtime, after the volume is mounted

---

## Issue 5: Hosted site shows sample cards instead of real photos

### Symptom
- The site loads
- But hero images and latest work show fallback/sample content

### Root cause
Usually this means:
- schema exists
- app is running
- but the hosted database contains no real content rows yet

This is not the same as "R2 is broken."

### How to interpret it

#### If DB has no content
- app falls back to sample/fallback display

#### If DB has content but image URLs are broken
- cards may exist, but images will fail to load

### Fix
Choose one:

#### Option A: Fresh production content
- Create albums in production
- Re-upload photos from admin

#### Option B: Import local content
- Bring the local production-ready content data into `/data/expose.db`

For this project, Option A is simpler if old local content does not matter.

---

## Issue 6: Remote R2 images failed in `next/image`

### Symptom
The app failed with errors like:

```text
Invalid src prop ... hostname is not configured under images
```

### Root cause
- Photo URLs were already using R2 public URLs
- But `next.config.ts` did not allow that host in `images.remotePatterns`

### Fix applied
- Parse `R2_PUBLIC_BASE_URL`
- Add the host to `images.remotePatterns`

### Why this matters
- Without it, Next.js blocks remote image optimization for R2-hosted images

---

## Issue 7: Dev and build artifacts polluted each other

### Symptom
- `next dev` and `next build` produced inconsistent type/build behavior
- old `.next` or `.next-build-output` files interfered with verification

### Root cause
- Development and production outputs were not fully isolated
- A running dev server could keep `.next` locked on Windows

### Fix applied
- Keep dev and production outputs separated
- Use production build verification independently

### Operational note
- If local dev server is still running, it can lock `.next`
- Do not treat a dirty or locked local `.next` folder as evidence that Railway is wrong

---

## Issue 8: R2 credentials were exposed during setup

### Symptom
- Access key / secret were visible in screenshots during setup

### Risk
- Those credentials should be treated as compromised

### Fix
- Rotate R2 credentials after deployment is stable
- Update Railway variables with the rotated keys

---

## Issue 9: Railway variables do not automatically mirror local `.env`

### Symptom
- Local app works
- Hosted app fails due to missing auth, DB, or R2 config

### Root cause
- Railway does not read the local developer machine `.env`
- All required production vars must be added in Railway

### Fix
Explicitly set production variables in Railway `Variables`

At minimum:

```env
DATABASE_URL=file:/data/expose.db
DATA_BACKEND=prisma
STORAGE_BACKEND=r2
AUTH_SECRET=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=expose
R2_PUBLIC_BASE_URL=...
R2_ENDPOINT=...
```

---

## Quick Troubleshooting Order

When hosted deployment is broken, follow this order:

1. Check `Deploy Logs`
2. Check `HTTP Logs`
3. Confirm `DATABASE_URL=file:/data/expose.db`
4. Confirm volume mount path is `/data`
5. Confirm Prisma schema has been applied
6. Confirm Railway variables are complete
7. Confirm homepage is runtime-rendered
8. Confirm hosted DB actually contains real content rows

---

## Best-Practice Summary

For this repo's current v1 architecture:

- Railway is the app host
- SQLite must live on a mounted volume
- Prisma migrations must run against that volume
- Homepage DB reads must happen at runtime
- R2 should store all uploaded image objects
- Hosted data may start empty, and that is acceptable if you intentionally re-upload content
