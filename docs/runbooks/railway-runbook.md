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
- Windows: the `railway` npm SDK runs `$_ --version` (or `railway --version`) to check the CLI and fails with "requires Railway CLI 5.42.1 or newer" when it finds only npm's shim. Point it at the real exe first (PowerShell; in Git Bash `$_` is overwritten by the shell, so use PowerShell):

  ```powershell
  $exe = "$env:APPDATA\npm\node_modules\@railway\cli\bin\railway.exe"
  $env:_ = $exe
  & $exe config plan
  ```
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
- Automatic, see "資料庫備份與還原" below (`backups/db/` in `expose-private`)

### R2
- Keep bucket/key conventions documented
- `expose-private` holds the only full-resolution copies (originals); back it up, and do not delete it when cleaning up
- Rotate credentials if they were ever exposed

---

## 資料庫備份與還原

資料庫 `/data/expose.db`（相簿、照片標題、留言、按讚、精選、瀏覽統計）會自動備份到私有 bucket `expose-private` 的 `backups/db/expose-YYYYMMDD-HHmmss.db.gz`（時間是 UTC）。圖片檔在 R2，不在這份備份裡。

### 運作方式

- **在哪裡跑**：在 app 自己的容器裡，由 `scripts/start.mjs` 排程，開一個子程序執行 `scripts/backup-db.mjs`。Railway 的 volume 只能掛在一個 service 上，獨立的 cron service 讀不到 `/data`；`railway run` 是在本機跑，也讀不到。用子程序執行，備份當掉或記憶體用量暴增都不會影響網站。
- **什麼時候跑**：
  - 啟動 60 秒後檢查一次：最近 24 小時內沒有成功的備份就補做。
  - 之後每 10 分鐘檢查一次：每天的排程時間（`BACKUP_HOUR_UTC`，預設 19 UTC，也就是台北 03:00）過後，如果還沒做今天的備份就執行。
  - 失敗後等 1 小時再重試。
  - 兩個備份不會同時跑（`/tmp` 裡有 lock 檔）。
- **怎麼備份**：用 `VACUUM INTO` 取得一致性的快照（不是直接複製正在寫入的檔案），對快照跑 `PRAGMA quick_check`，gzip 後上傳，再用 HEAD 確認大小，最後刪掉暫存檔。
- **暫存檔放 `/tmp`**（可以用 `BACKUP_TMP_DIR` 改）：volume 只有 500MB，而且正式資料庫也在上面。把快照放在 volume 上，可能會把空間用完，讓網站自己的寫入失敗。開始之前會先檢查暫存資料夾剩下的空間有沒有資料庫大小的 2.2 倍。
- **失敗時**：只記錄 log（`[backup] failed ...`），網站照常運作。
- **關機時**：收到 SIGTERM 時，start.mjs 會先停掉排程，並對正在跑的備份送出 SIGTERM。備份程序會中止並清掉暫存檔，最多等 5 秒。這不會影響 Next 的優雅關機和 exit code。
- **狀態檔**：`/data/backup-status.json`（幾百 bytes），記錄最近一次執行的時間、結果、大小和錯誤訊息。後台 `/admin/backups` 會讀這個檔案。
- **保留策略**（每次備份成功後由程式清理）：
  - 每日：保留最近 14 份每日備份（每天只算當天最新的那份）。這是算**份數**，不是算日曆天，所以備份中斷一段時間時，舊的也不會被刪光。
  - 每月：最近 6 個月（含本月）每個月保留最早的一份，通常是 1 號那份；如果 1 號沒有備份，就保留那個月最早的一份。
  - 最新的一份一定會保留。名稱不符合格式的檔案一律不刪。
  - R2 lifecycle rule 沒辦法表達「每月 1 號那份留 6 個月」，所以由程式清理。如果想加一層保險，可以在 Cloudflare 的 `expose-private` → Settings → Object lifecycle rules 加一條：prefix `backups/db/`、物件超過 **200 天**就刪除。天數不能比 186 天短，不然會刪到每月備份。

選用的變數（平常不用設）：`BACKUP_HOUR_UTC`（0–23）、`BACKUP_DISABLED=1`（關閉自動備份）、`BACKUP_TMP_DIR`、`BACKUP_STATUS_PATH`。

### 手動備份和狀態

- 後台 → 「資料庫備份」（`/admin/backups`）：顯示最近一次執行的時間、結果、大小、錯誤訊息，以及目前保留的備份清單，並有「立即備份」按鈕。
- 指令（要在容器裡跑，才讀得到 `/data`）：

  ```bash
  railway ssh --service expose -- npm run db:backup
  ```

- Deploy Logs 會看到這樣的訊息：`[backup] ok (auto-startup): r2://expose-private/backups/db/expose-20261109-190012.db.gz 1.2 MB gz from 4.8 MB db in 0.9s; retention removed 0`

### 還原（不會自動覆蓋，最後一步要人工確認）

`scripts/restore-db.mjs`（`npm run db:restore`）只會下載、解壓、驗證，**不會動到 `/data/expose.db`**。指定的輸出路徑是正式資料庫，或是它的 `-journal`/`-wal` 檔時，腳本會拒絕執行。

1. **選一份備份**：

   ```bash
   railway ssh --service expose -- npm run db:restore -- --list
   ```

2. **先把目前的狀態也備份一份**（就算內容有問題，也留一份可以回頭）：

   ```bash
   railway ssh --service expose -- npm run db:backup
   ```

3. **進入維護模式（停服務）**：Railway → expose → Variables 新增 `EXPOSE_MAINTENANCE=1`，按 Deploy。新的容器會跑 `prisma migrate deploy`，但 `start.mjs` 不會啟動 Next，也不會排程備份，只是保持在線上，讓你可以 `railway ssh` 進去。這時網站會無法連線。Deploy Logs 會看到 `[start] EXPOSE_MAINTENANCE=1: not starting the site or backups`。
   - 這個變數是暫時的，沒有寫進 `.railway/railway.ts`。在維護模式期間**不要**執行 `railway config apply`。

4. **下載並驗證**（寫到 volume 上，這樣重新部署後還在。volume 要有大約一份資料庫大小的空間）：

   ```bash
   railway ssh --service expose -- npm run db:restore -- --key backups/db/expose-YYYYMMDD-HHmmss.db.gz --out /data/expose-restore.db --compare /data/expose.db
   ```

   確認輸出有 `PRAGMA integrity_check: ok`，並比對各資料表的筆數（左邊是備份，右邊是目前的資料庫）。如果不是 `ok`，換一份更舊的備份。

5. **人工確認後替換**（進容器的 shell：`railway ssh --service expose`）：

   ```sh
   ls -la /data
   # 舊的檔案（連同 -journal/-wal/-shm）改名保留，不要直接刪
   for f in /data/expose.db /data/expose.db-journal /data/expose.db-wal /data/expose.db-shm; do
     [ -e "$f" ] && mv "$f" "$f.before-restore"
   done
   mv /data/expose-restore.db /data/expose.db
   ls -la /data
   ```

6. **重新啟動**：在 Variables 刪掉 `EXPOSE_MAINTENANCE`，按 Deploy。start command 會先跑 `prisma migrate deploy`，如果備份的 schema 比較舊，會補上缺少的 migration。

7. **確認**：
   - Deploy Logs 沒有錯誤；約 1 分鐘後會看到 `[backup] ...`（剛還原的資料庫狀態檔沒有變，所以可能是 skip，也可能會做一次備份）。
   - 首頁、相簿頁、照片頁都正常；後台的照片數、留言數和第 4 步的筆數一致。
   - 到後台「資料庫備份」按一次「立即備份」。
   - 確認幾天沒問題後，再刪掉 `/data/*.before-restore`（會佔 volume 空間）。

**回到還原前的狀態**：重做第 3 步，把 `.before-restore` 的檔案改回原本的名稱，再重做第 6 步。

### 本機

`STORAGE_BACKEND=local` 時，備份會寫到 `storage/private/backups/db/`（已加進 .gitignore）。`DATA_BACKEND` 不是 `prisma`（例如 json 模式）時，不會做備份。

---

## Recommended Next Improvements

1. Replace `r2.dev` with `img.<your-domain>`
2. Rotate exposed R2 credentials
3. Add a one-photo production smoke test after each deploy
4. Back up `expose-private/uploads/` (originals) somewhere outside R2
