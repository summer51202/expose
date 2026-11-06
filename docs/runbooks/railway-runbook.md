# Railway Runbook

## Purpose

This document is the fastest path for getting this project online on Railway with the current production architecture:

- Next.js app hosted on Railway
- SQLite stored on a Railway persistent volume
- Prisma as the database access layer
- Cloudflare R2 for uploaded images

This is the recommended v1 hosting path for this repo.

---

## Current Production Architecture

### App server
- Railway hosts the running Next.js process
- Production should use `npm run start`
- Do not use `npm run dev` in hosted environments

### Database
- SQLite is the current production database
- The database file must live on a Railway persistent volume
- Recommended path:

```env
DATABASE_URL=file:/data/expose.db
```

### ORM
- Prisma reads and writes all albums, photos, comments, and likes
- App code should not assume direct SQL access

### Object storage
- Cloudflare R2 stores original, medium, and thumbnail image files
- Public image rendering uses `R2_PUBLIC_BASE_URL`

---

## First-Time Setup

### 1. Create the Railway service
- Create a new Railway project
- Connect the GitHub repository
- Create the app service for this repo

### 2. Create the persistent volume
- Add a Railway volume
- Mount it at:

```text
/data
```

Why:
- SQLite is file-based
- Railway service filesystem is not enough by itself for durable DB storage
- The volume keeps `/data/expose.db` across redeploys and restarts

### 3. Set required Railway variables

At minimum, set these in Railway `Variables`:

```env
DATABASE_URL=file:/data/expose.db
DATA_BACKEND=prisma
STORAGE_BACKEND=r2
AUTH_SECRET=<long-random-secret>
ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<admin-password>
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_BUCKET_NAME=expose
R2_PUBLIC_BASE_URL=https://pub-xxxxxxxxxxxxxxxx.r2.dev
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
SITE_URL=https://<your-public-domain>
GOOGLE_SITE_VERIFICATION=<search-console-token>
```

Notes:
- `SITE_URL` is the public origin used for canonical URLs, share-preview (Open Graph) URLs, `robots.txt` and `sitemap.xml`. If unset, the app falls back to Railway's `RAILWAY_PUBLIC_DOMAIN`, then `http://localhost:3000`. Set it explicitly once a custom domain is attached.
- `GOOGLE_SITE_VERIFICATION` is optional. Set it to the `content` value of the Search Console HTML-tag verification (`<meta name="google-site-verification" content="...">`). The root layout then emits that meta tag on every page. Leave it set after verifying, or Search Console loses ownership.
- Railway does not automatically use your local `.env`
- Every production variable must be added in Railway
- `AUTH_SECRET` is required for session/cookie signing

### 4. Start Command (set in `.railway/railway.ts`)

The service settings (start command, GitHub source, volume mount, variable names) are described in `.railway/railway.ts` (Railway infrastructure as code, replaces the old `railway.json`):

```bash
npx prisma migrate deploy && exec node scripts/start.mjs
```

Railway does **not** read `.railway/` during deploys. A change in that file only reaches Railway when you run:

```powershell
railway config plan    # read-only, shows the diff
railway config apply   # writes the change to the service settings
```

- Always read the plan first. It must not show deleted variables, a removed GitHub source or a detached volume. Variables are `preserve()` in the file, so secret values are never committed.
- Windows: the `railway` npm SDK runs `$_ --version` (or `railway --version`) to check the CLI and fails with "requires Railway CLI 5.42.1 or newer" when it finds only npm's shim. Point it at the real exe first: `$env:_ = "$env:APPDATA
pm
ode_modules@railwaycliinailway.exe"` (PowerShell) or `_=<that path> railway config plan` (Git Bash).
- If the dashboard is changed by hand, run `railway config pull --force` and commit the result, so the file does not undo it on the next apply.

Why:
- The volume is available at runtime, not build time
- Prisma migrations should run after the service starts with the volume mounted
- `scripts/start.mjs` runs `next start` and exits 0 when Railway stops the old container with SIGTERM during a redeploy. With `npm run start`, Next's exit code 143 and npm's "signal SIGTERM" error made every redeploy show "Deployment crashed". Real crashes still exit non-zero.

---

## First Deploy Checklist

### Step 1. Deploy
- Trigger the first deploy
- Wait until Railway marks the deploy successful

### Step 2. Verify schema exists
- Open the app
- If logs show:

```text
The table `main.Photo` does not exist
```

then the DB file exists but Prisma schema has not been applied yet

### Step 3. Verify login
- Open `/admin/login`
- Log in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`

### Step 4. Decide whether to import old data
Two valid options:

#### Option A: Fresh production start
- Do not import local content
- Create albums again in production
- Re-upload photos from the admin UI

#### Option B: Import existing local content
- Move the existing production-ready SQLite/Prisma data into the hosted DB
- Only do this if you want the old content preserved

For this repo, Option A is acceptable and simpler if you do not care about preserving prior local content.

### Step 5. Upload one test photo
- Create one album
- Upload one image
- Confirm it appears on:
  - `/`
  - `/albums/[slug]`
  - `/photos/uploaded/[id]`

---

## Day-to-Day Operating Flow

### When code changes
1. Push to GitHub
2. Railway redeploys
3. Check deploy status
4. Open the site
5. If something is wrong, inspect logs

### Which logs to check

#### Deploy Logs
Use first for:
- Prisma initialization failures
- missing tables
- missing environment variables
- startup failures

#### HTTP Logs
Use when:
- deploy succeeded
- app is online
- specific routes still return 500

---

## Production Usage Model

### If you keep production as a fresh hosted site
- The local data is not required
- New uploads become the canonical production content
- R2 becomes the source of truth for images
- Railway SQLite becomes the source of truth for metadata

### If you later want real production parity
- Import the local SQLite/Prisma content
- Confirm all image URLs still point to R2

---

## Required Backups

At minimum document and protect:

### SQLite
- Backup `/data/expose.db`

### R2
- Keep bucket/key conventions documented
- Rotate credentials if they were ever exposed

---

## Recommended Next Improvements

1. Replace `r2.dev` with `img.<your-domain>`
2. Rotate exposed R2 credentials
3. Add a documented DB backup routine
4. Add a one-photo production smoke test after each deploy
