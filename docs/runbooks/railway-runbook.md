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
- Cloudflare R2, two buckets with the same API token and endpoint:
  - `R2_BUCKET_NAME` (`expose`, public via `R2_PUBLIC_BASE_URL`): `uploads/<name>-large.webp`, `-medium.webp`, `-thumb.webp`
  - `R2_PRIVATE_BUCKET_NAME` (`expose-private`, never public): `uploads/<name>-original.webp`
- Originals have no URL. The DB stores `originalUrl = "private:<key>"` and `originalKey = <key>`; only server code reads them (GetObject), e.g. to regenerate derivatives
- Photos uploaded before the private bucket existed keep a public `originalUrl` until `npm run originals:migrate:private -- --apply` moves them (see "Private Originals" below)

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
R2_PRIVATE_BUCKET_NAME=expose-private
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
- `R2_PRIVATE_BUCKET_NAME` is required with `STORAGE_BACKEND=r2`. Without it (or if it equals `R2_BUCKET_NAME`) every upload fails with a clear error; originals are never written to the public bucket

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
ode_modules@railwaycliin
ailway.exe"` (PowerShell) or `_=<that path> railway config plan` (Git Bash).
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

## Private Originals

Originals (`*-original.webp`, full resolution, WebP q92, EXIF/GPS stripped) live in a private
bucket so nobody can download them by changing `-large` to `-original` in an image URL.

### Private bucket rules (Cloudflare R2)
- Bucket `expose-private`, Standard storage class
- **Public access: off. r2.dev subdomain: off. Custom domain: none.** Never turn any of these on; that would make originals downloadable again
- The R2 API token used by Railway (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`) must have **Object Read & Write on both `expose` and `expose-private`**. Same token, same `R2_ENDPOINT`

### Railway variables
- Add `R2_PRIVATE_BUCKET_NAME=expose-private` **before** deploying code that uses it (uploads fail without it)
- Nothing else changes: `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, the keys and endpoint stay as they are

### Local development
- `STORAGE_BACKEND=local` writes originals to `storage/private/uploads/` (gitignored, outside `public/`, so Next never serves them). Derivatives stay in `public/uploads/`

### One-off: move existing originals (`scripts/migrate-originals-private.mjs`)

Run it **inside the Railway service**, where `DATABASE_URL=file:/data/expose.db` points at the
mounted `/data` volume. Do **not** use `railway run` for this: it runs on your own machine with
Railway's variables, and `/data/expose.db` does not exist there (the script refuses to start in
that case).

From the repo folder (already linked with `railway link`; project expose / production / service expose):

```bash
# 0. confirm you are in the container and the DB is the volume
railway ssh --service expose -- sh -c 'echo $DATABASE_URL; ls -l /data/expose.db'

# 1. dry run (default): lists each original that would move, with its size
railway ssh --service expose -- npm run originals:migrate:private

# 2. after checking the list: move them
railway ssh --service expose -- npm run originals:migrate:private -- --apply
```

(Or open a shell with `railway ssh --service expose`, then run `npm run originals:migrate:private`
and `npm run originals:migrate:private -- --apply` in `/app`.)

What `--apply` does for each photo, in order:
1. reads the original from `expose` and writes it to `expose-private` (same key)
2. reads the private copy back and checks size and sha256 match
3. updates the DB row: `originalUrl = "private:<key>"`, `originalKey = <key>`
4. deletes the original from `expose`

It ends with `Migrated N, cleaned N leftover public copies, skipped N, failed N`. Exit code is 1 if
anything failed. It is safe to re-run after an interruption: photos already marked private are
skipped, and a public copy left behind (crash between steps 3 and 4) is deleted once the private
copy is confirmed. A failed photo is left untouched in the DB and in `expose`.

### Verify afterwards
- Take a `-large.webp` URL of an old photo from a page, change `-large` to `-original`: it must return 404
- In Cloudflare, `expose` should have no `*-original.webp` objects left; `expose-private` should have one per photo
- `npm run images:regenerate` (see Public Derivatives below) reads originals from the private bucket

---

## Public Derivatives (watermark, size, copyright EXIF)

Everything the public sees is a derivative rendered from the private original by
`src/lib/uploads/derivative-render.mjs` (shared by uploads and scripts):

| derivative | long edge | watermark | key |
|---|---|---|---|
| large | 2048px (`LARGE_MAX_DIMENSION`) | yes | `uploads/<base>-large.v2.webp` |
| medium | 1200px | yes | `uploads/<base>-medium.v2.webp` |
| thumbnail | 400px | no | `uploads/<base>-thumb.v2.webp` |

- **Watermark**: `© <siteConfig.photographerName>` bottom-right, semi-transparent white with a soft
  shadow. Font size and margin are ratios of the image's short edge. Switch, text, opacity, size,
  shadow and font are all in the `WATERMARK` object. The font is bundled
  (`src/lib/uploads/fonts/Geist-Regular.ttf`, SIL OFL) because the Railway image has no system fonts
- **EXIF**: every derivative carries only `Artist = Edward Lee` and
  `Copyright = (C) Edward Lee. All rights reserved.` (EXIF text is ASCII, so libvips writes `©` as
  `(C)`), plus the technical tags libvips always writes (orientation = 1, resolution, pixel size).
  Nothing from the original's EXIF (camera, dates, **GPS**) is copied. Photo info shown on the site
  comes from the DB (`exifData`), not from the image files
- **New uploads** get all of this immediately; nothing to run
- What it looks like: `docs/runbooks/images/watermark-preview.jpg` (2048px large, landscape and portrait, plus 1:1 crops of the corner)
- **DB `width` / `height`** are the original's displayed size (after EXIF rotation), not a derivative's

### Versioned keys

The `.v2` in the key is `DERIVATIVE_VERSION`. When the look of the derivatives changes again
(watermark, size, quality), bump it and run the regenerate script: every photo gets new URLs, so
the CDN and browsers cannot keep serving the old images (all derivatives are cached
`immutable` for a year), and the old URLs return 404 once the old files are deleted.

### After merging: regenerate existing photos (`scripts/regenerate-derivatives.mjs`)

Re-renders large/medium/thumbnail of every photo from its original. Run it **inside the Railway
service** (same reason as the originals migration above: `railway run` would not see `/data/expose.db`;
the script refuses to start in that case). Wait until the deploy with this code is live first.

```bash
# 1. dry run (default): lists each photo: original -> new keys, and the old keys it will delete
railway ssh --service expose -- npm run images:regenerate

# 2. one photo first, then check it on the site (watermark, size) before doing the rest
railway ssh --service expose -- npm run images:regenerate -- --apply --limit 1

# 3. everything else (photos already on .v2 keys are skipped)
railway ssh --service expose -- npm run images:regenerate -- --apply
```

Other options: `--only <photo id>` processes one specific photo. Locally:
`DATA_BACKEND=json STORAGE_BACKEND=local npm run images:regenerate` (originals from
`storage/private/uploads/`, or `public/uploads/` for legacy local photos).

What `--apply` does for each photo, in order:
1. reads the original (private bucket; legacy photos not yet migrated: public bucket)
2. renders the three derivatives and uploads them to the new `.v2` keys in `expose`
3. updates the DB row: `largeUrl/Key`, `mediumUrl/Key`, `thumbnailUrl/Key` (and `width/height`
   if they did not match the original)
4. deletes the old derivative files from `expose` (never the original)

It ends with `Regenerated N, cleaned N leftover old files, already current N, skipped N, failed N`.
Exit code is 1 if anything failed. A failed photo keeps its old images and DB row. Safe to re-run
(also if `railway ssh` drops mid-run): photos already on `.v2` keys are skipped, and old files left
behind by a crash between steps 3 and 4 are deleted. Rough speed: 1–3 s per photo, so ~991 photos
take roughly 20–45 minutes.

### Verify afterwards
- Open an old photo's page: the large image has the watermark bottom-right and its URL ends in `-large.v2.webp`
- Download that large: long edge 2048px; `exiftool` (or any EXIF viewer) shows Artist/Copyright and no GPS
- The old URL (same URL without `.v2`) returns 404
- Re-run the dry run: `would regenerate 0`

---

## Required Backups

At minimum document and protect:

### SQLite
- Backup `/data/expose.db`

### R2
- Keep bucket/key conventions documented
- `expose-private` holds the only full-resolution copies (originals); back it up, and do not delete it when cleaning up
- Rotate credentials if they were ever exposed

---

## Recommended Next Improvements

1. Replace `r2.dev` with `img.<your-domain>`
2. Rotate exposed R2 credentials
3. Add a documented DB backup routine
4. Add a one-photo production smoke test after each deploy
