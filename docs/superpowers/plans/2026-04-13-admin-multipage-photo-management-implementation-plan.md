# Admin Multipage Photo Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 admin backend from the 2026-04-12 design: split admin into dedicated pages, add complete photo album reassignment, and fix upload selected-state and batch-limit feedback.

**Architecture:** Keep the current Next.js 16 App Router, Server Actions, and repository pattern. Add focused `/admin/*` pages behind the existing admin session guard, move existing admin widgets into those pages, and extend `PhotoRepository` so both Prisma and manifest storage can move photos between albums without page components touching storage details.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Server Actions, Prisma + SQLite, manifest fallback repositories, Cloudflare R2, Tailwind CSS 4

---

## Source Documents

- Feedback backlog: `docs/issue-tracker/user-feedback-backlog.md`
- Approved v1 design: `docs/superpowers/specs/2026-04-12-admin-multipage-photo-management-design.md`
- Superseded broad plan: `docs/superpowers/plans/2026-04-10-admin-feedback-implementation-plan.md`

This plan implements the 2026-04-12 v1 scope only:

- Included: feedback 1, 2, 3, 4.
- Deferred: feedback 5 album cover slideshow, feedback 6 admin comment replies.

---

## Architecture Diagram

```text
Browser
  |
  v
Next.js App Router /admin/*
  |
  +-- src/app/admin/layout.tsx
  |     shared admin route boundary
  |
  +-- src/components/admin/admin-shell.tsx
  |     nav, page frame, logout surface
  |
  +-- /admin          Dashboard stats + workflow links
  +-- /admin/upload   UploadForm -> uploadPhotosAction
  +-- /admin/photos   PhotoManager -> photo-actions
  +-- /admin/albums   AlbumForm + AlbumEditorForm
  +-- /admin/comments CommentModerationList
  +-- /admin/likes    LikeSummaryList

Server Actions
  |
  +-- uploadPhotosAction()
  |     requireAdminSession()
  |     validate upload input
  |     uploadPhotos()
  |       processUpload()
  |       getStorageDriver().putObject()
  |       getPhotoRepository().savePhotos()
  |
  +-- movePhotoToAlbumAction()
  +-- movePhotosToAlbumAction()
        requireAdminSession()
        validate album + photos
        getPhotoRepository().movePhoto(s)ToAlbum()
        revalidate affected paths

Repositories
  |
  +-- PrismaPhotoRepository
  |     prisma.photo.findMany/create/update/updateMany
  |
  +-- ManifestPhotoRepository
        listManifestPhotos()/replaceManifestPhotos()
```

---

## Function Workflows

### Upload Workflow

```text
Admin opens /admin/upload
  -> Select destination album
  -> Select image files
  -> Client shows count, total size, filenames, limits
  -> Submit enabled only when album + files are present
  -> uploadPhotosAction validates session, album id, count, total size, type, per-file size
     -> invalid: same page shows actionable error; selected files remain visible
     -> valid: files processed, stored, and saved
        -> success state returned
        -> UploadForm clears file input and selected filenames
```

### Photo Reassignment Workflow

```text
Admin opens /admin/photos
  -> Server loads all uploaded photos + album options
  -> Admin filters by album or reviews full list
  -> Single move: choose target album in one row and submit
  -> Bulk move: select photos, choose target album, submit
  -> Action validates target album and selected photos
     -> invalid: visible error
     -> valid: repository updates albumId/albumName/albumSlug or Prisma relation
        -> admin and public paths revalidate
```

### Admin Navigation Workflow

```text
/admin
  +-- Upload photos     -> /admin/upload
  +-- Manage photos     -> /admin/photos
  +-- Manage albums     -> /admin/albums
  +-- Moderate comments -> /admin/comments
  +-- Review likes      -> /admin/likes
  +-- Visit site        -> /
```

---

## Page Mockups

### `/admin` Dashboard

```text
+------------------------------------------------------------------+
| 管理後台                                      [前往網站] [登出]   |
| 你好，<username>                                                  |
+------------------------------------------------------------------+
| [照片總數 128] [相簿 9] [留言 23] [被按讚照片 18]                |
+------------------------------------------------------------------+
| 主要工作                                                         |
| [上傳照片] [管理照片] [管理相簿] [留言管理] [按讚統計]           |
+------------------------------------------------------------------+
| 最近狀態                                                         |
| - 最新上傳照片 / 時間 / 相簿                                     |
+------------------------------------------------------------------+
```

### `/admin/upload`

```text
+------------------------------------------------------------------+
| 管理後台 > 上傳照片                         [回總覽] [登出]      |
+------------------------------------------------------------------+
| 上傳照片                                                         |
| 先選相簿，再選照片。上傳完成後選取清單會自動清空。               |
+------------------------------------------------------------------+
| 目的相簿 * [ 請選擇相簿 v ]                                     |
|                                                                  |
| +--------------------------------------------------------------+ |
| | 選擇照片                                                     | |
| | JPG, PNG, WebP, AVIF. 單張 20MB，最多 24 張，整批 200MB。   | |
| +--------------------------------------------------------------+ |
|                                                                  |
| 已選 14 張 / 143.2MB                                             |
| [IMG_1011.jpg] [IMG_1012.jpg] [IMG_1013.jpg] [+11 張]            |
|                                                                  |
| [開始上傳]                                                       |
+------------------------------------------------------------------+
```

### `/admin/photos`

```text
+------------------------------------------------------------------+
| 管理後台 > 管理照片                         [回總覽] [登出]      |
+------------------------------------------------------------------+
| 篩選相簿 [ 全部相簿 v ]                                          |
| 批次操作: 已選 3 張  移動到 [ 東京街拍 v ] [批次移動]            |
+------------------------------------------------------------------+
| [ ] Thumb | Title      | Current album | Size      | Actions     |
| [ ] img   | IMG 1011   | 未分類        | 3000x2000 | [v] [移動]  |
| [ ] img   | IMG 1012   | 東京街拍      | 2400x1600 | [v] [移動]  |
+------------------------------------------------------------------+
```

### `/admin/albums`

```text
+------------------------------------------------------------------+
| 建立相簿                                                         |
| [相簿名稱] [相簿描述] [建立新相簿]                               |
+------------------------------------------------------------------+
| 目前相簿                                                         |
| 東京街拍 42 張 [查看相簿]                                        |
| [名稱 input] [描述 textarea] [儲存相簿設定]                      |
+------------------------------------------------------------------+
```

### `/admin/comments` And `/admin/likes`

```text
/admin/comments: reuse CommentModerationList on its own page.
/admin/likes:    reuse LikeSummaryList on its own page.
```

---

## File Structure

### Create

- `src/app/admin/layout.tsx` - shared route boundary.
- `src/app/admin/upload/page.tsx` - upload page.
- `src/app/admin/photos/page.tsx` - photo management page.
- `src/app/admin/albums/page.tsx` - album management page.
- `src/app/admin/comments/page.tsx` - comment moderation page.
- `src/app/admin/likes/page.tsx` - like summary page.
- `src/app/admin/photo-actions.ts` - server actions for single and bulk photo moves.
- `src/components/admin/admin-shell.tsx` - admin frame and navigation.
- `src/components/admin/photo-manager.tsx` - client UI for filtering, selecting, and moving photos.
- `src/lib/uploads/upload-limits.ts` - shared upload constants and pure validation.

### Modify

- `src/app/admin/page.tsx` - convert from all-in-one page to dashboard.
- `src/components/admin/upload-form.tsx` - add controlled album/file state and success reset.
- `src/app/admin/upload-actions.ts` - validate required album and limits.
- `src/lib/uploads/upload-service.ts` - reuse shared upload validation.
- `src/lib/photos/repository.ts` - add move methods for Prisma and manifest.
- `src/lib/photos/queries.ts` - add admin photo list helper.
- `next.config.ts` - align Server Action body limit with v1 batch size.
- `docs/issue-tracker/user-feedback-backlog.md` - record current v1 execution plan.

---

## Shared Implementation Contracts

### Upload Limits

Create `src/lib/uploads/upload-limits.ts` with:

```ts
export const MAX_UPLOAD_FILES = 24;
export const MAX_UPLOAD_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_TOTAL_SIZE_BYTES = 200 * 1024 * 1024;

export const ALLOWED_UPLOAD_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export type UploadValidationInput = {
  files: File[];
  albumId: number | null;
};

export type UploadValidationResult =
  | { ok: true; files: File[]; albumId: number }
  | { ok: false; error: string };
```

The same file must expose:

- `formatBytes(bytes: number): string`
- `validateUploadInput(input: UploadValidationInput): UploadValidationResult`

Validation order:

1. album id is required
2. at least one non-empty file is required
3. max file count
4. max total bytes
5. allowed MIME type
6. per-file size limit

### Photo Repository Contract

Extend `PhotoRepository`:

```ts
export type PhotoAlbumAssignment = {
  id: number;
  name: string;
  slug: string;
};

export interface PhotoRepository {
  listUploadedPhotos(): Promise<PhotoRecord[]>;
  savePhotos(records: PhotoRecord[]): Promise<void>;
  renameAlbumReferences(albumId: number, name: string, slug: string): Promise<void>;
  movePhotoToAlbum(photoId: number, album: PhotoAlbumAssignment): Promise<void>;
  movePhotosToAlbum(photoIds: number[], album: PhotoAlbumAssignment): Promise<void>;
}
```

Manifest updates must write `albumId`, `albumName`, and `albumSlug`. Prisma updates only need `albumId`, because reads already join album metadata.

---

## Implementation Tasks

### Task 1: Update Feedback Backlog For Current V1 Scope

**Files:**
- Modify: `docs/issue-tracker/user-feedback-backlog.md`
- Create: `docs/superpowers/plans/2026-04-13-admin-multipage-photo-management-implementation-plan.md`

- [ ] **Step 1: Add current execution note near the top**

Insert after the summary:

```md
## Current Execution Plan

The active v1 implementation is documented in:

- `docs/superpowers/specs/2026-04-12-admin-multipage-photo-management-design.md`
- `docs/superpowers/plans/2026-04-13-admin-multipage-photo-management-implementation-plan.md`

This v1 targets feedback 1-4:

- large upload clarity and guardrails
- production-ready multipage admin structure
- complete uploaded-photo management
- required upload destination and post-upload correction

Feedback 5 album cover slideshow and feedback 6 admin comment replies remain in the backlog for later phases.
```

- [ ] **Step 2: Verify documentation links**

Run:

```powershell
rg -n "Current Execution Plan|2026-04-13-admin-multipage-photo-management|Feedback 5|Feedback 6" docs/issue-tracker/user-feedback-backlog.md
```

Expected: The new plan path appears, and feedback 5/6 still exist as deferred backlog items.

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/issue-tracker/user-feedback-backlog.md docs/superpowers/plans/2026-04-13-admin-multipage-photo-management-implementation-plan.md
git commit -m "docs: plan admin photo management implementation"
```

---

### Task 2: Create Shared Admin Shell And Dashboard

**Files:**
- Create: `src/components/admin/admin-shell.tsx`
- Create: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Read relevant Next.js docs**

Run:

```powershell
Get-Content -Path node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
```

Expected: Confirm nested layouts wrap child pages and do not need root `html` / `body`.

- [ ] **Step 2: Create `AdminShell`**

Create `src/components/admin/admin-shell.tsx`:

```tsx
import Link from "next/link";

import { logoutAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "總覽" },
  { href: "/admin/upload", label: "上傳照片" },
  { href: "/admin/photos", label: "管理照片" },
  { href: "/admin/albums", label: "管理相簿" },
  { href: "/admin/comments", label: "留言管理" },
  { href: "/admin/likes", label: "按讚統計" },
];

type AdminShellProps = {
  children: React.ReactNode;
  username?: string;
};

export function AdminShell({ children, username }: AdminShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12">
      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">管理後台</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">
            {username ? `你好，${username}` : "內容管理"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="text-sm text-stone-700 underline-offset-4 hover:underline">
            前往網站
          </Link>
          <form action={logoutAction}>
            <Button variant="secondary" type="submit">登出</Button>
          </form>
        </div>
      </header>
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Admin navigation">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </main>
  );
}
```

- [ ] **Step 3: Add minimal admin layout**

Create `src/app/admin/layout.tsx`:

```tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 4: Convert `/admin` to dashboard**

Modify `src/app/admin/page.tsx` so it:

- calls `requireAdminSession()`
- fetches uploaded photos, albums, admin comments, and like summaries
- renders dashboard stats and workflow links
- does not render `UploadForm`, `AlbumForm`, `AlbumEditorForm`, `CommentModerationList`, or `LikeSummaryList`

Use `getPhotoRepository().listUploadedPhotos()`, `getAlbums()`, `getAdminComments()`, and `getAdminLikeSummaries()`.

- [ ] **Step 5: Verify**

Run:

```powershell
npm run build
```

Expected: Build succeeds and `/admin` no longer imports old all-in-one widgets.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/components/admin/admin-shell.tsx src/app/admin/layout.tsx src/app/admin/page.tsx
git commit -m "feat: add admin dashboard shell"
```

---

### Task 3: Move Existing Admin Workflows To Dedicated Pages

**Files:**
- Create: `src/app/admin/upload/page.tsx`
- Create: `src/app/admin/albums/page.tsx`
- Create: `src/app/admin/comments/page.tsx`
- Create: `src/app/admin/likes/page.tsx`

- [ ] **Step 1: Create upload page**

Create `/admin/upload` with `AdminShell`, `Panel`, `UploadForm`, `getAlbumOptions()`, and `requireAdminSession()`.

Required page title: `新增照片到相簿`

Required helper copy: `先選相簿，再選照片。上傳完成後，已選照片清單會自動清空。`

- [ ] **Step 2: Create albums page**

Create `/admin/albums` with `AdminShell`, `AlbumForm`, `AlbumEditorForm`, `getAlbums()`, and public album links.

Preserve:

- album creation
- album name update
- album description update
- album photo count display

- [ ] **Step 3: Create comments page**

Create `/admin/comments` with `AdminShell`, `CommentModerationList`, `getAdminComments()`, and `requireAdminSession()`.

Preserve delete-comment behavior.

- [ ] **Step 4: Create likes page**

Create `/admin/likes` with `AdminShell`, `LikeSummaryList`, `getAdminLikeSummaries()`, and `requireAdminSession()`.

Preserve clear-likes behavior.

- [ ] **Step 5: Verify**

Run:

```powershell
npm run build
```

Expected: Build succeeds and new `/admin/*` routes appear in the build output.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/app/admin/upload/page.tsx src/app/admin/albums/page.tsx src/app/admin/comments/page.tsx src/app/admin/likes/page.tsx
git commit -m "feat: split admin workflows into pages"
```

---

### Task 4: Add Upload Limits And Success Reset

**Files:**
- Create: `src/lib/uploads/upload-limits.ts`
- Modify: `src/components/admin/upload-form.tsx`
- Modify: `src/app/admin/upload-actions.ts`
- Modify: `src/lib/uploads/upload-service.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Create upload limits helper**

Create `src/lib/uploads/upload-limits.ts` with the constants and validation contract listed above.

Required error messages:

- missing album: `請先選擇要放入的相簿。`
- no files: `請至少選擇一張照片。`
- too many files: `一次最多上傳 24 張照片。`
- unsupported type must include the filename and accepted formats
- oversized file must include the filename and `20MB`
- oversized batch must include actual total and `200MB`

- [ ] **Step 2: Update upload service**

Modify `src/lib/uploads/upload-service.ts`:

- remove local upload constants
- import `validateUploadInput`
- call it before album lookup and before `processUpload`
- reject missing or unknown album
- keep the existing storage and image processing loop

Required structure:

```ts
const validation = validateUploadInput({
  files,
  albumId: albumId ?? null,
});

if (!validation.ok) {
  throw new Error(validation.error);
}

const album =
  (await getAlbumOptions()).find((item) => item.id === validation.albumId) ?? null;

if (!album) {
  throw new Error("找不到這本相簿，請重新整理後再試一次。");
}

const validFiles = validation.files;
```

- [ ] **Step 3: Update upload action**

Modify `src/app/admin/upload-actions.ts`:

- parse `albumId` as `number | null`
- pass that value to `uploadPhotos`
- keep `requireAdminSession()`
- keep revalidation for `/`, `/admin`, and add `/admin/upload`

- [ ] **Step 4: Update upload form**

Modify `src/components/admin/upload-form.tsx`:

- add `useEffect` and `useRef`
- track selected album id
- track selected file metadata, not only names
- display selected count and total size
- disable submit until album and files are present
- clear file input and selected files when `state.success` changes

Required reset:

```tsx
useEffect(() => {
  if (!state.success) {
    return;
  }

  setSelectedFiles([]);
  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}, [state.success]);
```

- [ ] **Step 5: Align Next config**

Modify `next.config.ts`:

```ts
serverActions: {
  bodySizeLimit: "220mb",
},
```

This gives margin above the 200MB product limit without pretending the current flow is a resumable uploader.

- [ ] **Step 6: Verify**

Run:

```powershell
npm run build
```

Expected: Build succeeds and no server-only module is imported into `UploadForm`.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/lib/uploads/upload-limits.ts src/components/admin/upload-form.tsx src/app/admin/upload-actions.ts src/lib/uploads/upload-service.ts next.config.ts
git commit -m "feat: harden admin upload limits"
```

---

### Task 5: Add Photo Repository Album Move Support

**Files:**
- Modify: `src/lib/photos/repository.ts`
- Modify: `src/lib/photos/queries.ts`

- [ ] **Step 1: Extend repository interface**

Add `PhotoAlbumAssignment`, `movePhotoToAlbum`, and `movePhotosToAlbum` to `src/lib/photos/repository.ts` using the contract in this plan.

- [ ] **Step 2: Add manifest assignment helper**

Add:

```ts
function assignPhotoAlbum(photo: PhotoRecord, album: PhotoAlbumAssignment): PhotoRecord {
  return {
    ...photo,
    albumId: album.id,
    albumName: album.name,
    albumSlug: album.slug,
  };
}
```

- [ ] **Step 3: Implement manifest move methods**

Add to `jsonPhotoRepository`:

```ts
async movePhotoToAlbum(photoId, album) {
  const photos = await listManifestPhotos();
  await replaceManifestPhotos(
    photos.map((photo) => (photo.id === photoId ? assignPhotoAlbum(photo, album) : photo)),
  );
},
async movePhotosToAlbum(photoIds, album) {
  const targetIds = new Set(photoIds);
  const photos = await listManifestPhotos();
  await replaceManifestPhotos(
    photos.map((photo) => (targetIds.has(photo.id) ? assignPhotoAlbum(photo, album) : photo)),
  );
},
```

- [ ] **Step 4: Implement Prisma move methods**

Add to `prismaPhotoRepository`:

```ts
async movePhotoToAlbum(photoId, album) {
  await prisma.photo.update({
    where: { id: toPrismaBigInt(photoId) },
    data: { albumId: toPrismaBigInt(album.id) },
  });
},
async movePhotosToAlbum(photoIds, album) {
  await prisma.photo.updateMany({
    where: {
      id: {
        in: photoIds.map((photoId) => toPrismaBigInt(photoId)),
      },
    },
    data: { albumId: toPrismaBigInt(album.id) },
  });
},
```

- [ ] **Step 5: Add admin photo query helper**

Modify `src/lib/photos/queries.ts`:

```ts
export async function getAdminUploadedPhotos(): Promise<GalleryPhoto[]> {
  return getPhotoRepository().listUploadedPhotos();
}
```

- [ ] **Step 6: Verify**

Run:

```powershell
npm run build
```

Expected: TypeScript accepts the updated repository contract and existing repository users still compile.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/lib/photos/repository.ts src/lib/photos/queries.ts
git commit -m "feat: support moving photos between albums"
```

---

### Task 6: Add Photo Move Server Actions

**Files:**
- Create: `src/app/admin/photo-actions.ts`

- [ ] **Step 1: Create action file with parsing helpers**

Create `src/app/admin/photo-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

import { getAlbumRepository } from "@/lib/albums/repository";
import { requireAdminSession } from "@/lib/auth/session";
import { getPhotoRepository } from "@/lib/photos/repository";

export type PhotoMoveFormState = {
  error?: string;
  success?: string;
};

function parseNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePhotoIds(formData: FormData) {
  return formData
    .getAll("photoIds")
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isFinite(value) && value > 0);
}

async function getTargetAlbum(albumId: number) {
  const albums = await getAlbumRepository().listAlbums();
  return albums.find((album) => album.id === albumId) ?? null;
}

function revalidatePhotoMovePaths(photoIds: number[], albumSlug: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/albums");
  revalidatePath(`/albums/${albumSlug}`);

  for (const photoId of photoIds) {
    revalidatePath(`/photos/uploaded/${photoId}`);
  }
}
```

- [ ] **Step 2: Add single move action**

Add:

```ts
export async function movePhotoToAlbumAction(
  photoId: number,
  _prevState: PhotoMoveFormState,
  formData: FormData,
): Promise<PhotoMoveFormState> {
  await requireAdminSession();

  const albumId = parseNumber(formData.get("albumId"));
  if (!albumId) {
    return { error: "請選擇要移動到哪一本相簿。" };
  }

  const album = await getTargetAlbum(albumId);
  if (!album) {
    return { error: "找不到這本相簿，請重新整理後再試一次。" };
  }

  await getPhotoRepository().movePhotoToAlbum(photoId, {
    id: album.id,
    name: album.name,
    slug: album.slug,
  });

  revalidatePhotoMovePaths([photoId], album.slug);

  return { success: `已移動到「${album.name}」。` };
}
```

- [ ] **Step 3: Add bulk move action**

Add:

```ts
export async function movePhotosToAlbumAction(
  _prevState: PhotoMoveFormState,
  formData: FormData,
): Promise<PhotoMoveFormState> {
  await requireAdminSession();

  const photoIds = parsePhotoIds(formData);
  if (photoIds.length === 0) {
    return { error: "請先選擇要移動的照片。" };
  }

  const albumId = parseNumber(formData.get("albumId"));
  if (!albumId) {
    return { error: "請選擇要移動到哪一本相簿。" };
  }

  const album = await getTargetAlbum(albumId);
  if (!album) {
    return { error: "找不到這本相簿，請重新整理後再試一次。" };
  }

  await getPhotoRepository().movePhotosToAlbum(photoIds, {
    id: album.id,
    name: album.name,
    slug: album.slug,
  });

  revalidatePhotoMovePaths(photoIds, album.slug);

  return { success: `已將 ${photoIds.length} 張照片移動到「${album.name}」。` };
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run build
```

Expected: Server Action file compiles and imports only server-safe modules.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/app/admin/photo-actions.ts
git commit -m "feat: add photo album move actions"
```

---

### Task 7: Build Photo Management Page

**Files:**
- Create: `src/components/admin/photo-manager.tsx`
- Create: `src/app/admin/photos/page.tsx`

- [ ] **Step 1: Create `PhotoManager` client component**

Create `src/components/admin/photo-manager.tsx` with:

- `"use client"`
- props: `photos: GalleryPhoto[]`, `albums: Array<{ id: number; name: string }>`
- album filter state: `"all" | "unassigned" | album id string`
- selected photo ids state
- bulk form using `movePhotosToAlbumAction`
- row form using `movePhotoToAlbumAction.bind(null, photo.id)`
- thumbnail, title, current album, dimensions, public photo link, single move controls

Required UI behavior:

- Show all photos when filter is `all`.
- Show `albumId == null` photos when filter is `unassigned`.
- Disable bulk move when no photos are selected.
- Show success and error messages from both single and bulk actions.

- [ ] **Step 2: Create photos page**

Create `src/app/admin/photos/page.tsx`:

```tsx
import { AdminShell } from "@/components/admin/admin-shell";
import { PhotoManager } from "@/components/admin/photo-manager";
import { Panel } from "@/components/ui/panel";
import { getAlbumOptions } from "@/lib/albums/queries";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminUploadedPhotos } from "@/lib/photos/queries";

export default async function AdminPhotosPage() {
  const session = await requireAdminSession();
  const [photos, albums] = await Promise.all([
    getAdminUploadedPhotos(),
    getAlbumOptions(),
  ]);

  return (
    <AdminShell username={session.username}>
      <Panel>
        <h2 className="text-2xl font-semibold text-stone-900">管理照片</h2>
        <p className="mt-3 leading-7 text-stone-700">
          查看所有已上傳照片，修正相簿歸類。這裡會列出全部照片，不只最近上傳。
        </p>
        <div className="mt-6">
          <PhotoManager photos={photos} albums={albums} />
        </div>
      </Panel>
    </AdminShell>
  );
}
```

- [ ] **Step 3: Verify**

Run:

```powershell
npm run build
```

Expected: Build succeeds and `/admin/photos` compiles.

- [ ] **Step 4: Commit**

Run:

```powershell
git add src/components/admin/photo-manager.tsx src/app/admin/photos/page.tsx
git commit -m "feat: add admin photo management page"
```

---

### Task 8: Final Verification And Acceptance

**Files:**
- No code changes expected unless verification finds issues.

- [ ] **Step 1: Run build**

Run:

```powershell
npm run build
```

Expected: exit code 0.

- [ ] **Step 2: Run session verification**

Run:

```powershell
.session/verify.ps1
```

Expected: script completes successfully.

- [ ] **Step 3: Manual route checks**

Check:

- `/admin` shows dashboard stats and workflow links only.
- `/admin/upload` shows upload form.
- `/admin/photos` lists all uploaded photos.
- `/admin/albums` preserves album create/edit.
- `/admin/comments` preserves delete flow.
- `/admin/likes` preserves like summary and clear flow.

- [ ] **Step 4: Manual upload checks**

Check:

- Select album and small valid batch.
- Selected filenames and total size appear.
- Submit succeeds.
- Success message appears.
- Selected filenames disappear.
- The file input has no selected files.
- Missing album, too many files, oversized total, oversized single file, and unsupported type all show actionable errors.

- [ ] **Step 5: Manual photo move checks**

Check:

- Move one photo to another album.
- Move multiple selected photos to another album.
- `/admin/photos` reflects new album labels.
- `/admin/albums` counts update.
- Old public album no longer includes moved photos.
- New public album includes moved photos.
- Photo detail pages still load.

- [ ] **Step 6: Commit verification fixes if needed**

If verification required fixes:

```powershell
git add <changed-files>
git commit -m "fix: polish admin photo management flow"
```

If no files changed, do not create an empty commit.

---

## Spec Coverage Review

- Multipage admin backend: Tasks 2 and 3.
- Dashboard as hub: Task 2.
- Upload page: Tasks 3 and 4.
- Upload success clears selected files: Tasks 4 and 8.
- Upload limits and messaging: Tasks 4 and 8.
- Complete `/admin/photos` page: Tasks 5, 6, 7, and 8.
- Single photo move: Tasks 5, 6, 7, and 8.
- Bulk photo move: Tasks 5, 6, 7, and 8.
- Album edit preserved: Tasks 3 and 8.
- Comments and likes preserved: Tasks 3 and 8.
- Feedback 5 and 6 deferred explicitly: Task 1.

No 2026-04-12 v1 acceptance criterion is intentionally left out.

---

## Execution Notes

- Do not implement direct-to-R2 uploads in this plan.
- Do not implement resumable/chunked upload in this plan.
- Do not implement comment replies in this plan.
- Do not implement album cover slideshow in this plan.
- Keep existing server-side admin authorization checks in every Server Action.
- Preserve repository parity between Prisma and manifest backends.
- Use `apply_patch` for edits.
- Read `node_modules/next/dist/docs/` before changing Next.js routing/config behavior.
