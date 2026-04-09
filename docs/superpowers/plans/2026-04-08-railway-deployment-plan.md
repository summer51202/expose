# Railway Deployment Plan

**Goal:** Put the current photo site online without requiring your local computer to keep `npm run dev` or `npm run start` running.

**Recommended stack for v1:** Railway + persistent volume + SQLite + Cloudflare R2

**Why this path:** Your app already works with `Prisma + SQLite + R2`. Railway can host the Next.js server and attach a persistent disk, which lets SQLite remain stable without forcing a PostgreSQL migration first.

---

## What Each Piece Does

### Railway
- Hosts the running Next.js server for you
- Keeps the app online 24/7
- Handles deploys from your repository
- Can attach a persistent disk and custom domain

### Persistent Volume
- A mounted disk that survives restarts and redeploys
- Needed because SQLite stores data in a file
- Without a volume, your database file could disappear on redeploy

### SQLite
- Your current production data file
- Stores albums, photos, comments, likes, and admin-facing content metadata
- Good fit for v1 because only you upload content and traffic is light

### Prisma
- The ORM layer between the app and SQLite
- App code talks to Prisma, not raw SQL
- Makes it easier to change database engines later if needed

### Cloudflare R2
- Stores the actual image files
- Keeps large media files out of your app server and database
- Works well for photo-heavy sites and public image delivery

### R2 Public Base URL
- The browser-facing URL prefix used to display images
- Current v1 setup can use the R2 public bucket URL
- Later you can swap this to `img.yourdomain.com` without rewriting the upload flow

---

## Minimum Deployment Steps

### Phase 1: Prepare Railway

1. Create a Railway account and a new project.
2. Connect the project to this app's repository.
3. Add one service for the Next.js app.
4. Add a persistent volume to the service.
5. Mount the volume at:

```text
/data
```

### Phase 2: Configure Production Environment

6. Set the production database path to the mounted volume:

```env
DATABASE_URL="file:/data/expose.db"
```

7. Set these production environment variables in Railway:

```env
AUTH_SECRET="replace-with-a-long-random-secret"
ADMIN_USERNAME="your-admin-name"
ADMIN_PASSWORD="your-strong-password"
DATA_BACKEND="prisma"
STORAGE_BACKEND="r2"
DATABASE_URL="file:/data/expose.db"
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="expose"
R2_PUBLIC_BASE_URL="https://pub-xxxxxxxxxxxxxxxx.r2.dev"
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
```

8. Confirm the app is started in production mode:

```text
npm run start
```

Do not use:

```text
npm run dev
```

### Phase 3: Deploy

9. Trigger the first Railway deploy.
10. Wait for build and startup to complete.
11. Open the Railway public URL.
12. Go to:

```text
/admin/login
```

13. Log in with the production admin credentials.

### Phase 4: Initialize and Verify Data

14. Confirm the SQLite database file exists in the mounted volume.
15. Confirm Prisma can read and write through:

```text
file:/data/expose.db
```

16. If the deployed DB is empty, initialize the schema before using the site.
17. Verify the homepage loads.
18. Verify one album page loads.
19. Verify one photo detail page loads.

### Phase 5: Verify Real Uploads

20. Upload one real image from the admin UI.
21. Confirm the photo record is saved in SQLite.
22. Confirm the image files land in R2.
23. Confirm the public image URLs load in the browser.
24. Confirm the uploaded photo appears on:
- `/`
- `/albums/[slug]`
- `/photos/uploaded/[id]`

### Phase 6: Hardening After First Successful Deploy

25. Rotate the currently exposed R2 credentials.
26. Add your real site domain to Railway.
27. Keep image delivery on the current R2 public URL for v1.
28. After the site is stable, optionally move images to:

```text
img.yourdomain.com
```

29. Decide how to back up:
- `/data/expose.db`
- R2 bucket contents

---

## Deployment Checklist

- [ ] Railway project created
- [ ] App service created
- [ ] Persistent volume mounted at `/data`
- [ ] `DATABASE_URL` set to `file:/data/expose.db`
- [ ] All admin env vars set
- [ ] All R2 env vars set
- [ ] First deploy completes
- [ ] `/admin/login` works
- [ ] One photo uploads successfully
- [ ] Homepage shows uploaded content
- [ ] R2 public image URL loads
- [ ] R2 credentials rotated after deployment

---

## Known Limits of This v1 Setup

- SQLite is fine for this personal site, but it is not the most common long-term hosted database choice.
- `r2.dev` is acceptable for the first release, but a custom image domain is a more mature production setup.
- You still need a backup routine for the SQLite file and R2 objects.
- This plan gets you online fast; it does not yet add full monitoring, rate limiting, or CI/CD maturity.

---

## Future Upgrade Path

If traffic, admin workflows, or hosting complexity grows later, the next technical upgrades are:

1. Move SQLite to PostgreSQL
2. Move `R2_PUBLIC_BASE_URL` from `r2.dev` to `img.yourdomain.com`
3. Add monitoring and error reporting
4. Add automated deploy verification

