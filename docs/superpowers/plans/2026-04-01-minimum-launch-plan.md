# Minimum Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the smallest production-usable version of the photo site: deployable build, authenticated admin, durable database-backed content, durable object storage, and a verified browse/upload flow.

**Architecture:** Keep the current app structure and UI. Fix the deployment blockers first, then switch persistence from JSON and local disk to Prisma/PostgreSQL and R2 behind the existing repository pattern, then finish with a single end-to-end smoke pass and a lightweight operations checklist.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma, PostgreSQL, Cloudflare R2, ESLint, Sharp, PowerShell verify scripts

---

## File Map

### Existing files to modify
- `src/components/home/album-strip-section.tsx`
- `src/components/gallery/slideshow-viewer.tsx`
- `.session/verify.ps1`
- `.session/init.ps1`
- `src/lib/uploads/image-pipeline.ts`
- `src/lib/uploads/upload-service.ts`
- `src/lib/photos/repository.ts`
- `src/lib/albums/repository.ts`
- `src/lib/comments/repository.ts`
- `src/lib/likes/repository.ts`
- `src/lib/photos/queries.ts`
- `src/lib/albums/queries.ts`
- `src/app/admin/upload-actions.ts`
- `src/app/admin/album-actions.ts`
- `src/app/admin/engagement-actions.ts`
- `.env.example`
- `package.json`

### Existing files to read for implementation context
- `docs/design/p1-auth-data-storage-design.md`
- `docs/design/p1-auth-data-storage-checklist.md`
- `prisma/schema.prisma`
- `scripts/migrate-json-to-prisma.mjs`
- `scripts/verify-prisma-import.mjs`

### New files likely needed
- `src/lib/storage/types.ts`
- `src/lib/storage/provider.ts`
- `src/lib/storage/local-driver.ts`
- `src/lib/storage/r2-driver.ts`
- `src/lib/storage/url.ts`
- `docs/runbooks/launch-checklist.md`

---

## Phase 1: Deployment Baseline

### Task 1: Fix production build blockers

**Files:**
- Modify: `src/components/home/album-strip-section.tsx`
- Modify: `src/components/gallery/slideshow-viewer.tsx`

- [ ] **Step 1: Reproduce the current build failure**

Run:

```powershell
npm run build
```

Expected: FAIL with a Turbopack error pointing at the data-URL Tailwind class in `album-strip-section.tsx`.

- [ ] **Step 2: Replace the Tailwind arbitrary background URL with plain inline style or a local CSS-safe pattern**

Implementation target:

```tsx
const noiseTextureStyle = {
  backgroundImage: "url(<noise-texture-data-url>)",
};

<div
  className="absolute inset-0 opacity-20 mix-blend-overlay"
  style={noiseTextureStyle}
/>
```

- [ ] **Step 3: Replace corrupted placeholder glyphs in the same file with ASCII-safe text**

Implementation target:

```tsx
<div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
  <span aria-hidden="true">-></span>
</div>
```

- [ ] **Step 4: Clean up the slideshow lint warning without changing behavior**

Implementation target:

```tsx
useEffect(() => {
  if (!isOpen) return;

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      closeViewer();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setCurrentIndex((i) => (i + 1) % photos.length);
      return;
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [isOpen, photos.length]);
```

- [ ] **Step 5: Re-run build and lint**

Run:

```powershell
npx eslint .
npm run build
```

Expected: `eslint` returns only acceptable warnings or zero warnings; `build` succeeds.

- [ ] **Step 6: Commit**

```powershell
git add src/components/home/album-strip-section.tsx src/components/gallery/slideshow-viewer.tsx
git commit -m "fix: restore production build baseline"
```

### Task 2: Update init and verify scripts for Next.js 16

**Files:**
- Modify: `.session/verify.ps1`
- Modify: `.session/init.ps1`

- [ ] **Step 1: Replace removed `next lint` usage with ESLint CLI**

Implementation target:

```powershell
$lintResult = npx eslint . 2>&1
```

- [ ] **Step 2: Keep the verify contract simple and accurate**

Verification flow should be:
- lint with `npx eslint .`
- typecheck with `npx tsc --noEmit`
- build with `npx next build`
- optional git status info only

- [ ] **Step 3: Run the verify script end-to-end**

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .session\verify.ps1
```

Expected: script finishes, reports the actual lint/build status, and no longer fails because of a removed Next.js command.

- [ ] **Step 4: Commit**

```powershell
git add .session/verify.ps1 .session/init.ps1
git commit -m "chore: update session scripts for next 16"
```

---

## Phase 2: Durable Data and Storage

### Task 3: Cut primary data reads and writes over to Prisma/PostgreSQL

**Files:**
- Modify: `src/lib/photos/repository.ts`
- Modify: `src/lib/albums/repository.ts`
- Modify: `src/lib/comments/repository.ts`
- Modify: `src/lib/likes/repository.ts`
- Modify: `src/lib/photos/queries.ts`
- Modify: `src/lib/albums/queries.ts`
- Read: `prisma/schema.prisma`
- Read: `scripts/migrate-json-to-prisma.mjs`
- Read: `scripts/verify-prisma-import.mjs`

- [ ] **Step 1: Verify the schema is sufficient for current UI DTOs**

Check that the Prisma `Photo` model supports:
- URL fields
- dimensions
- EXIF
- blur placeholder
- album relation
- created timestamps

If a field used by UI is missing, add it before migrating.

- [ ] **Step 2: Run Prisma client generation and local migration**

Run:

```powershell
npx prisma generate
npx prisma migrate dev --name launch-baseline
```

Expected: Prisma client is generated and the local DB schema matches the app.

- [ ] **Step 3: Import JSON manifest data into PostgreSQL**

Run:

```powershell
npm run data:migrate:prisma
npm run data:verify:prisma
```

Expected: albums, uploaded photos, comments, and likes are present in PostgreSQL with a clean verification summary.

- [ ] **Step 4: Set the app to use Prisma as the primary backend**

Update local env for testing:

```env
DATA_BACKEND="prisma"
```

- [ ] **Step 5: Verify browse and admin queries now read from Prisma**

Manual checks:
- `/` shows uploaded photos if any exist
- `/albums/[slug]` shows correct counts
- `/admin` shows recent uploads
- comment and like admin lists still render

- [ ] **Step 6: Commit**

```powershell
git add prisma/schema.prisma src/lib/photos/repository.ts src/lib/albums/repository.ts src/lib/comments/repository.ts src/lib/likes/repository.ts src/lib/photos/queries.ts src/lib/albums/queries.ts
git commit -m "feat: switch primary content backend to prisma"
```

### Task 4: Add storage driver abstraction and keep local storage working

**Files:**
- Create: `src/lib/storage/types.ts`
- Create: `src/lib/storage/provider.ts`
- Create: `src/lib/storage/local-driver.ts`
- Create: `src/lib/storage/r2-driver.ts`
- Create: `src/lib/storage/url.ts`
- Modify: `src/lib/uploads/image-pipeline.ts`
- Modify: `src/lib/uploads/upload-service.ts`
- Modify: `.env.example`

- [ ] **Step 1: Define the storage driver contract**

Implementation target:

```ts
export interface StorageDriver {
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    cacheControl?: string;
  }): Promise<{ key: string; url: string }>;
}
```

- [ ] **Step 2: Implement a local driver that writes to `public/uploads`**

Use the existing logic from `image-pipeline.ts` as the first driver so the app keeps working while introducing the abstraction.

- [ ] **Step 3: Implement an R2 driver with env-backed configuration**

Use env values already present in `.env.example`:

```env
STORAGE_BACKEND="local"
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_BASE_URL=""
R2_ENDPOINT=""
```

- [ ] **Step 4: Refactor image processing to return variant buffers and metadata, not file paths**

Target split:
- `image-pipeline.ts` builds original, medium, thumbnail, blur, exif, dimensions
- storage driver persists objects
- upload service saves returned keys and URLs

- [ ] **Step 5: Verify the local driver path still works before R2 cutover**

Run:

```powershell
npx eslint .
npx tsc --noEmit
npm run build
```

Manual check:
- upload one photo
- confirm recent uploads updates
- confirm resulting URLs load

- [ ] **Step 6: Commit**

```powershell
git add src/lib/storage src/lib/uploads/image-pipeline.ts src/lib/uploads/upload-service.ts .env.example
git commit -m "feat: introduce storage driver abstraction"
```

### Task 5: Cut uploads over to Cloudflare R2

**Files:**
- Modify: `src/lib/storage/provider.ts`
- Modify: `src/lib/storage/r2-driver.ts`
- Modify: `src/lib/uploads/upload-service.ts`
- Modify: `src/lib/photos/repository.ts`
- Modify: `.env.example`

- [ ] **Step 1: Configure real R2 credentials in local `.env`**

Required values:

```env
STORAGE_BACKEND="r2"
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_PUBLIC_BASE_URL="..."
R2_ENDPOINT="..."
```

- [ ] **Step 2: Ensure upload persistence stores stable object URLs and keys**

Photo records should preserve:
- `originalUrl`
- `mediumUrl`
- `thumbnailUrl`
- `originalKey`
- `mediumKey`
- `thumbnailKey`
- `storageProvider`

- [ ] **Step 3: Upload one photo through the admin UI**

Manual check:
- object exists in R2
- the returned public URL uses `R2_PUBLIC_BASE_URL`
- homepage and photo detail page render the uploaded image

- [ ] **Step 4: Re-run the full baseline verification**

Run:

```powershell
npx eslint .
npx tsc --noEmit
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File .session\verify.ps1
```

Expected: all commands pass with R2 enabled.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/storage/provider.ts src/lib/storage/r2-driver.ts src/lib/uploads/upload-service.ts src/lib/photos/repository.ts .env.example
git commit -m "feat: switch uploads to r2 storage"
```

---

## Phase 3: Launch Smoke Flow and Operations

### Task 6: Verify the minimum real-world product loop

**Files:**
- Modify if needed: `src/app/admin/upload-actions.ts`
- Modify if needed: `src/app/admin/album-actions.ts`
- Modify if needed: `src/app/admin/engagement-actions.ts`
- Modify if needed: `src/lib/auth/session.ts`
- Modify if needed: `src/lib/auth/config.ts`

- [ ] **Step 1: Verify auth and admin protection**

Manual checks:
- logged-out request to `/admin` redirects to `/admin/login`
- valid login reaches `/admin`
- logout clears access

- [ ] **Step 2: Verify upload flow**

Manual checks:
- create one album
- upload one photo into that album
- recent uploads on `/admin` updates

- [ ] **Step 3: Verify browse flow**

Manual checks:
- `/` shows the uploaded photo
- `/albums/[slug]` shows the photo under the correct album
- `/photos/uploaded/[id]` opens correctly

- [ ] **Step 4: Verify engagement admin flow does not regress**

Manual checks:
- comment list renders in `/admin`
- like summary list renders in `/admin`
- delete comment action still works
- clear likes action still works

- [ ] **Step 5: Fix any single-step blockers found in the smoke run before proceeding**

Rule: do not broaden scope. Only fix issues that block the launch loop above.

- [ ] **Step 6: Commit**

```powershell
git add src/app/admin/upload-actions.ts src/app/admin/album-actions.ts src/app/admin/engagement-actions.ts src/lib/auth/session.ts src/lib/auth/config.ts
git commit -m "fix: close minimum launch smoke flow gaps"
```

### Task 7: Create a lightweight launch checklist and handoff doc

**Files:**
- Create: `docs/runbooks/launch-checklist.md`
- Modify if needed: `.env.example`
- Modify if needed: `README.md`

- [ ] **Step 1: Add a launch checklist document**

Document these sections:
- required env vars
- pre-deploy commands
- post-deploy smoke test
- backup/export reminder for DB and R2

- [ ] **Step 2: Keep the checklist intentionally small**

Checklist items should include:
- `npx eslint .`
- `npx tsc --noEmit`
- `npm run build`
- verify `/admin/login`
- verify one upload
- verify homepage render
- verify one photo detail page

- [ ] **Step 3: Save the final operational checklist**

Suggested structure:

```md
# Launch Checklist

## Before deploy
- [ ] Set production env vars
- [ ] Run lint, typecheck, build

## After deploy
- [ ] Login works
- [ ] Upload works
- [ ] Homepage shows uploaded content
- [ ] Photo detail works
```

- [ ] **Step 4: Commit**

```powershell
git add docs/runbooks/launch-checklist.md .env.example README.md
git commit -m "docs: add minimum launch checklist"
```

---

## Final Verification Gate

- [ ] Run:

```powershell
npx eslint .
npx tsc --noEmit
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File .session\verify.ps1
```

- [ ] Manually confirm:
- `/admin/login`
- `/admin`
- `/`
- `/albums/[slug]`
- `/photos/uploaded/[id]`

- [ ] Confirm production readiness criteria:
- build is green
- `DATA_BACKEND="prisma"`
- `STORAGE_BACKEND="r2"`
- admin login works with non-default credentials
- one fresh upload survives page reload and appears in browse pages

---

## Scope Notes

- Do not add i18n, lazy loading, slideshow redesign, or social features before launch.
- Do not redesign the UI while stabilizing the launch baseline.
- Do not replace the current auth approach unless it blocks the launch loop.
- Keep sample photo fallback support only if it does not interfere with uploaded content being primary.

## Self-Review

### Spec coverage
- Phase 1 covers deployability and verification.
- Phase 2 covers durable data and durable media storage.
- Phase 3 covers the minimum end-to-end product loop plus a launch checklist.

### Placeholder scan
- No `TODO`, `TBD`, or deferred implementation markers remain.

### Type consistency
- The plan consistently treats Prisma as the primary data backend and R2 as the production storage backend while preserving the existing repository and upload-service boundaries.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-01-minimum-launch-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
