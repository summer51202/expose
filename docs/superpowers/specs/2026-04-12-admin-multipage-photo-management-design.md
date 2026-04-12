# Admin Multipage Photo Management Design

## Context

Recent user feedback identifies four connected admin workflow problems:

- Uploading many photos through the current form is inefficient because failed or limited batches force the user to reopen the device photo picker and find the same date range again.
- After a successful upload, the selected file list remains visible, so the UI still looks like it has pending selected photos.
- The current admin photo-management surface only exposes a small recent subset, which makes it unclear why only some photos can be managed or moved.
- The admin backend places upload, album editing, recent uploads, comments, likes, and navigation in one page, making routine operation harder as content grows.

The current implementation confirms these problems:

- `src/app/admin/page.tsx` renders all admin areas in one route.
- `src/components/admin/upload-form.tsx` tracks selected filenames but does not clear the file input or local selected state after action success.
- `src/lib/photos/queries.ts` exposes `getRecentUploads(limit = 6)`, so the admin page only shows six recent uploads.
- `src/lib/photos/repository.ts` can list and create uploaded photos, but cannot move photos between albums or delete photos.
- `next.config.ts` currently sets `experimental.serverActions.bodySizeLimit` to `50mb`, while upload still sends complete image files through a Server Action request.

## Goals

Build a production-oriented admin information architecture and complete the first useful version of photo management.

The v1 experience must:

- Split the backend into dedicated admin pages instead of one dense page.
- Make `/admin` a dashboard and navigation hub, not the place where every workflow lives.
- Move upload workflow to `/admin/upload`.
- Clear selected photos after a successful upload.
- Add explicit upload limits and messaging so large batches fail clearly instead of leaving the user confused.
- Add `/admin/photos` with all uploaded photos, album filtering, and album reassignment.
- Support moving one photo and multiple selected photos to another album.
- Keep current album creation and album metadata editing working on a dedicated `/admin/albums` page.
- Keep comment moderation and like summaries available on dedicated admin pages.

## Non-Goals

This design does not include:

- Direct-to-R2 browser uploads.
- Resumable/chunked uploads.
- Drag-and-drop photo ordering.
- Album cover selection or slideshow.
- Comment replies.
- Multi-admin roles or permissions.

Those can follow once the admin structure and photo management foundation are stable.

## Recommended Approach

Use normal Next.js App Router pages under `/admin`:

- `/admin`
- `/admin/upload`
- `/admin/photos`
- `/admin/albums`
- `/admin/comments`
- `/admin/likes`

Add a shared admin layout component for page chrome and navigation. Keep auth enforcement in each server page by calling `requireAdminSession()`, matching the existing pattern.

For upload, keep the existing Server Action flow for v1, but make its boundaries explicit:

- Keep per-file validation.
- Add a max file count and max total selected size.
- Increase or align `serverActions.bodySizeLimit` only to the chosen supported batch size.
- Show the selected count, total size, and safe limits before submission.
- Reset the form after a successful upload by clearing the file input value and local selected state when the action state changes to success.

For photo management, extend the photo repository contract rather than editing Prisma or manifest data directly from actions:

- `listUploadedPhotos()` remains the source for admin photo lists.
- Add `movePhotoToAlbum(photoId, albumId)`.
- Add `movePhotosToAlbum(photoIds, albumId)`.
- Add `deletePhoto(photoId)` only if implementation stays small enough; otherwise leave delete as a clear follow-up.

Both Prisma and manifest repository implementations must support reassignment so local fallback behavior does not drift from production behavior.

## Admin Pages

### `/admin`

Purpose: dashboard and route hub.

Content:

- Greeting and logout.
- Short stats: total photos, albums, comments, likes.
- Navigation cards or links to Upload, Photos, Albums, Comments, Likes.
- Optional recent activity summary.

It should not contain full upload forms, album editor forms, or moderation lists.

### `/admin/upload`

Purpose: upload photos only.

Content:

- Album destination selector.
- File picker.
- Selected file summary with count and total size.
- First several filenames for confidence, with overflow count.
- Explicit limits: accepted formats, per-file limit, total batch limit, max file count.
- Submit button disabled until an album and at least one file are selected.
- Success message with uploaded count.
- On success, selected filenames disappear and the file input is empty.

Server validation remains required because Server Actions are reachable by POST.

### `/admin/photos`

Purpose: complete uploaded photo management.

Content:

- All uploaded photos, not only recent six.
- Filter by album, including an optional unassigned filter if legacy data has `albumId: null`.
- Search by title if low effort; otherwise defer.
- Each row/card shows thumbnail, title, current album, dimensions, and created date.
- Single-photo album move control.
- Bulk selection plus destination album selector for batch move.
- Links to public photo detail pages.

This page directly answers why only a few photos were visible before: the new surface must show the full managed set.

### `/admin/albums`

Purpose: album lifecycle and metadata.

Content:

- Existing album creation form.
- Existing album editor form for name and description.
- Photo counts.
- Links to public album pages.

Photo movement should live in `/admin/photos`, not inside each album editor, to keep responsibilities clear.

### `/admin/comments`

Purpose: comment moderation.

Content:

- Existing comment moderation list.
- Delete flow preserved.

### `/admin/likes`

Purpose: engagement review.

Content:

- Existing like summary list.
- Existing clear-likes action preserved.

## Data Flow

Upload flow:

1. `/admin/upload` fetches album options server-side.
2. `UploadForm` manages selected file display client-side.
3. `uploadPhotosAction` verifies admin session, validates album and files, calls `uploadPhotos`, and revalidates public/admin paths.
4. `UploadForm` observes success state and clears the file input plus selected files.

Photo move flow:

1. `/admin/photos` fetches uploaded photos and album options server-side.
2. Client controls collect selected photo ids and target album id.
3. `movePhotoToAlbumAction` or `movePhotosToAlbumAction` verifies admin session.
4. Action validates target album exists.
5. Action updates via `getPhotoRepository()`.
6. Action revalidates `/`, `/admin`, `/admin/photos`, old album pages, new album pages, and affected photo detail pages where practical.

## Error Handling

Upload errors should be actionable:

- No album selected: "請先選擇要放入的相簿。"
- No files selected: "請至少選擇一張照片。"
- Too many files: include max file count.
- Total size too large: include max total size.
- Unsupported type: include filename and allowed formats.
- Single file too large: include filename and per-file limit.

Photo move errors should be precise:

- No photos selected.
- No target album selected.
- Target album not found.
- One or more photos not found.

The UI should keep users on the same page after recoverable errors.

## Testing Strategy

Add focused tests around pure logic and repository behavior where the current project structure allows it:

- Upload validation rejects missing album, no files, too many files, total too large, and unsupported types before image processing.
- Upload form clears selected state after a success result.
- Photo repository can move one and many photos in both Prisma-backed and manifest-backed paths, or the shared transformation logic is tested if repository integration is too costly.
- Photo move actions reject invalid inputs and call repository methods after auth.

Run project verification:

- `npm run build`
- `.session/verify.ps1` before marking the feature complete.

Manual checks:

- `/admin` shows only dashboard navigation and stats.
- `/admin/upload` uploads a valid small batch, then clears selected files.
- `/admin/upload` rejects oversized batches with visible error text.
- `/admin/photos` shows all uploaded photos, not just six.
- Single and bulk album moves update admin counts and public album pages.
- `/admin/albums`, `/admin/comments`, and `/admin/likes` preserve existing workflows.

## Open Decisions

Recommended defaults:

- Max files per Server Action batch: 24.
- Max total selected size: 200MB.
- Per-file limit: keep current 20MB.
- Delete photo: defer unless reassignment implementation is smaller than expected.

These limits should be treated as product guardrails, not as a final upload architecture. If users need hundreds of full-resolution uploads at once, the next design should move to direct-to-storage or chunked upload.

## Acceptance Criteria

- Admin has separate pages for dashboard, upload, photos, albums, comments, and likes.
- Dashboard links clearly route to each backend workflow.
- Upload success clears selected file names and the actual file input.
- Upload form prevents submission until an album and files are selected.
- Server upload action rejects missing album and oversized batches.
- Photo management page lists all uploaded photos.
- Admin can move a single photo to another album.
- Admin can move multiple selected photos to another album.
- Album counts and public album pages reflect moved photos after revalidation.
- Existing album edit, comment moderation, and like reset functions still work.
