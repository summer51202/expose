# Admin Feedback Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current user feedback backlog into a staged implementation plan that improves upload safety, album management, admin usability, comment replies, and album-cover presentation.

**Architecture:** Start with the highest-risk operational workflow: prevent wrong uploads and make post-upload corrections possible. Then harden the upload pipeline, productize the admin UI around real tasks, and finally add visual polish for album covers. Keep the implementation aligned with the current Next.js 16 + Server Actions + Prisma/manifest repository split instead of introducing a new admin subsystem.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Server Actions, Prisma + SQLite, manifest fallback repositories, Cloudflare R2, Tailwind CSS 4

---

## Scope

This plan covers the six feedback items currently tracked in:

- `docs/issue-tracker/user-feedback-backlog.md`

Planned delivery order:

1. Upload destination must be explicit.
2. Admin can reassign photos to the correct album after upload.
3. Large upload batches fail safely or complete reliably.
4. Admin dashboard becomes production-oriented instead of prototype-oriented.
5. Admin can reply to viewer comments with a defined owner display name.
6. Album covers can rotate through album images like the hero section.

---

## File Map

### Existing files likely to change

- `src/components/admin/upload-form.tsx`
  - Upload destination UX, client-side validation, batch guardrails, progress/failure messaging.
- `src/app/admin/upload-actions.ts`
  - Server action validation for required destination and safer upload error handling.
- `src/lib/uploads/upload-service.ts`
  - Upload batching, total-size checks, and non-hanging failure behavior.
- `src/app/admin/page.tsx`
  - Admin information architecture and placement of album-management and comment-reply controls.
- `src/components/admin/album-editor-form.tsx`
  - Album metadata editing may be extended with management entry points.
- `src/lib/photos/repository.ts`
  - Add photo reassignment capability in both Prisma and manifest implementations.
- `src/lib/photos/queries.ts`
  - Support admin-facing photo lookup/grouping for album management UI.
- `src/lib/albums/queries.ts`
  - Continue providing album options and possibly enriched album-cover slideshow data.
- `src/components/admin/comment-moderation-list.tsx`
  - Expand from delete-only moderation to moderation + reply.
- `src/app/admin/engagement-actions.ts`
  - Add server action for owner replies.
- `src/app/photos/comment-actions.ts`
  - Keep public comment creation compatible with owner replies.
- `src/components/comments/comment-list.tsx`
  - Render owner replies distinctly under viewer comments.
- `src/app/photos/[source]/[id]/page.tsx`
  - Feed comment thread data and render updated comment UI.
- `prisma/schema.prisma`
  - Add reply structure if replies are stored in a dedicated relation or in `Comment`.

### New files likely to be added

- `src/components/admin/photo-album-manager.tsx`
  - Admin UI for reassigning photos to albums.
- `src/app/admin/photo-actions.ts`
  - Server actions for photo reassignment and bulk move.
- `src/lib/comments/thread-types.ts`
  - Shared types for viewer comments + owner replies if current `CommentRecord` becomes insufficient.
- `src/components/admin/comment-reply-form.tsx`
  - Inline admin reply form in the moderation area.
- `src/components/albums/album-cover-slideshow.tsx`
  - Reusable slideshow UI for album cover presentation.

### Verification surfaces

- `/admin`
- `/albums/[slug]`
- `/photos/[source]/[id]`
- `.session/verify.ps1`

---

## Decisions To Lock Before Coding

### Decision 1: Upload destination remains required

Use an empty placeholder as the default state. Do not silently fall back to "unclassified."

### Decision 2: Album correction is photo reassignment, not forced re-upload

Fix wrong uploads by updating photo-to-album assignment in stored data. Do not require users to upload the same files again.

### Decision 3: Owner replies use one fixed public display name

Use a single configured owner/brand display name for v1. Do not introduce multi-admin identities unless the product actually needs them.

Recommended v1 source:

- `SITE_OWNER_NAME` env/config value if available, otherwise a site-config constant.

### Decision 4: Album cover slideshow is lightweight

Prefer a small rotating set of album images with CSS/React timing similar to the hero. Do not create a heavy client-only gallery subsystem for album cards.

---

## Task 1: Enforce Required Upload Destination

**Files:**
- Modify: `src/components/admin/upload-form.tsx`
- Modify: `src/app/admin/upload-actions.ts`
- Modify: `src/lib/uploads/upload-service.ts`

- [ ] **Step 1: Lock the validation rule in the server path**

Implement the rule that missing `albumId` is invalid even if the client submits the form manually.

Expected behavior:

- `uploadPhotosAction` rejects empty destination.
- `uploadPhotos` rejects `albumId: null`.
- Error copy clearly says album selection is required.

- [ ] **Step 2: Align the client form with the server rule**

Update the upload form so the placeholder remains selected by default and the submit button is disabled until:

- at least one file is selected
- a valid album is selected

UI requirements:

- visible placeholder text such as `請先選擇上傳相簿`
- inline validation near the select control
- no misleading success path when destination is missing

- [ ] **Step 3: Keep the current form accessible**

Ensure the disabled/enabled state is understandable:

- preserve label + select semantics
- keep keyboard submission behavior correct
- do not hide the validation rule only in color

- [ ] **Step 4: Verify the flow manually**

Check:

- submit with no album is blocked in UI
- forced submit with no album still fails in server action
- valid album + files still uploads normally

Run:

```powershell
npm run build
```

Expected:

- build succeeds
- upload form compiles with no type issues

---

## Task 2: Add Post-Upload Album Reassignment

**Files:**
- Create: `src/components/admin/photo-album-manager.tsx`
- Create: `src/app/admin/photo-actions.ts`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/lib/photos/repository.ts`
- Modify: `src/lib/photos/queries.ts`
- Modify: `src/types/photo.ts`

- [ ] **Step 1: Extend the repository contract**

Add methods for:

- moving one photo to another album
- moving multiple photos to another album
- listing recent uploaded photos with album metadata suitable for admin editing

Both repository paths must work:

- Prisma-backed uploaded photos
- manifest-backed uploaded photos

- [ ] **Step 2: Add admin server actions for reassignment**

Create actions that:

- require admin session
- validate source photo ids and destination album id
- update data through the repository
- revalidate `/admin`, `/`, `/albums/[slug]`, and affected photo pages

- [ ] **Step 3: Add admin UI for correction**

Render a photo management section on `/admin` with:

- recent uploaded photos
- current album label
- a destination album selector
- move action for one photo

If the UI supports bulk move in the first pass, include:

- row selection
- one destination selector
- one bulk submit action

If bulk move adds too much risk, ship single-photo reassignment first and leave bulk move as a follow-up subtask inside the same feature.

- [ ] **Step 4: Preserve current album metadata editing**

Do not regress:

- album name update
- album description update
- album list rendering

- [ ] **Step 5: Verify album reassignment end-to-end**

Check:

- photo moves from wrong album to correct album in admin
- album counts update
- public album page reflects new membership
- photo detail page still loads

Run:

```powershell
npm run build
```

Expected:

- build succeeds
- no broken admin imports or repository types

---

## Task 3: Harden Large Upload Behavior

**Files:**
- Modify: `src/lib/uploads/upload-service.ts`
- Modify: `src/app/admin/upload-actions.ts`
- Modify: `src/components/admin/upload-form.tsx`
- Modify if needed: `next.config.ts`

- [ ] **Step 1: Define explicit upload guardrails**

Set and document v1 constraints:

- max files per batch
- max total payload size per submission
- per-file size limit

Recommended direction:

- keep per-file limit
- add total-size limit
- add file-count limit

- [ ] **Step 2: Fail early before expensive image processing**

In `upload-service`, validate:

- file count
- total bytes
- supported mime types
- empty-file filtering

Return actionable error messages before calling Sharp/image processing.

- [ ] **Step 3: Reduce all-or-nothing behavior**

Choose one:

- sequential processing with progress-safe reporting
- small internal batches with per-batch persistence

Recommended v1 approach:

- sequential processing or small batches
- stop on first fatal error
- return a message that indicates how many files completed before failure

- [ ] **Step 4: Improve admin feedback**

Update the form copy so users see:

- allowed file types
- file-count limit
- total-size limit
- error message without needing a browser refresh

- [ ] **Step 5: Re-check platform limits**

Confirm whether `serverActions.bodySizeLimit` in `next.config.ts` still matches the intended upload experience after new guardrails are added.

- [ ] **Step 6: Verify with realistic batches**

Manual verification targets:

- small valid batch uploads successfully
- oversize total batch fails with clear message
- oversize single file fails with clear message
- page remains interactive after failure

Run:

```powershell
npm run build
```

Expected:

- build succeeds
- no runtime-only assumptions leak into the client component

---

## Task 4: Productize the Admin Dashboard

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/components/admin/upload-form.tsx`
- Modify: `src/components/admin/album-editor-form.tsx`
- Modify: `src/components/admin/comment-moderation-list.tsx`
- Modify: `src/components/admin/like-summary-list.tsx`

- [ ] **Step 1: Audit and remove prototype framing**

Replace explanatory/mockup-heavy copy with task-oriented UI copy.

Target tone:

- concise
- operator-focused
- production-like

- [ ] **Step 2: Reorganize the page around real tasks**

Recommended top-level sections:

- Upload photos
- Manage photos/albums
- Manage comments
- Review engagement

Avoid phase labels if they read like an internal roadmap instead of an admin interface.

- [ ] **Step 3: Improve scanability**

Reduce long descriptive paragraphs and prefer:

- short supporting descriptions
- clearer action labels
- grouped controls

- [ ] **Step 4: Preserve current functionality**

Do not break:

- logout
- album editing
- upload access
- comment moderation
- like clearing

- [ ] **Step 5: Verify the dashboard reads as production UI**

Manual review:

- no "local dev", "phase", or tutorial-heavy wording unless intentionally retained
- first-screen actions are understandable in under 10 seconds

Run:

```powershell
npm run build
```

Expected:

- admin page compiles and renders with the updated structure

---

## Task 5: Add Owner Replies To Viewer Comments

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/comments/repository.ts`
- Modify: `src/lib/comments/queries.ts`
- Modify: `src/app/admin/engagement-actions.ts`
- Modify: `src/components/admin/comment-moderation-list.tsx`
- Modify: `src/components/comments/comment-list.tsx`
- Modify: `src/app/photos/[source]/[id]/page.tsx`
- Create: `src/components/admin/comment-reply-form.tsx`
- Create if needed: `src/types/comment-thread.ts`
- Modify if needed: `src/config/site.ts`

- [ ] **Step 1: Choose the reply data model**

Recommended v1 shape:

- keep viewer comments as the primary public entry
- attach at most one owner reply per viewer comment

This can be implemented as:

- extra fields on `Comment`, or
- a separate reply relation/table

Prefer the option that keeps public rendering and admin authoring simple.

- [ ] **Step 2: Define responder identity**

Expose one public owner label such as:

- site owner name
- studio name
- brand name

Do not derive the public reply label from the admin login username unless the product explicitly wants that behavior.

- [ ] **Step 3: Implement repository/query support**

Add methods to:

- create owner reply
- fetch comments with optional owner reply
- preserve delete-comment behavior

If deleting a parent comment should also remove the owner reply, make that explicit in the data model and query layer.

- [ ] **Step 4: Add admin reply UI**

In the admin comment section, each comment should support:

- viewing existing owner reply if present
- entering a reply if absent
- optionally editing/removing the reply in a later pass

For v1, reply-once is acceptable if it keeps scope controlled.

- [ ] **Step 5: Render replies publicly**

On the public photo page:

- show owner reply nested or visually attached below the viewer comment
- use a clear owner badge/name
- keep visitor nickname and owner reply styling distinct

- [ ] **Step 6: Verify the comment thread flow**

Check:

- visitor leaves comment
- admin sees comment in backend
- admin replies
- public page shows reply with the configured owner identity

Run:

```powershell
npm run build
```

Expected:

- schema/types align
- comment list renders without thread-shape mismatches

---

## Task 6: Add Album Cover Random Slideshow

**Files:**
- Create: `src/components/albums/album-cover-slideshow.tsx`
- Modify: `src/lib/albums/queries.ts`
- Modify: `src/app/(browse)/page.tsx`
- Modify: `src/app/albums/[slug]/page.tsx`
- Modify any album card/list component that currently renders static cover imagery

- [ ] **Step 1: Decide slideshow placement**

Recommended v1 rollout:

- start with album cards or album strip cover areas
- extend to album detail header only if the first placement performs well

- [ ] **Step 2: Prepare album image data**

Update album queries to return a small set of candidate image URLs per album, not just a single cover.

Keep data payloads bounded:

- use medium or thumbnail URLs
- limit to a small number of images per album

- [ ] **Step 3: Build a lightweight slideshow component**

Reuse the hero interaction style where it fits:

- timed rotation
- subtle crossfade
- fallback to one image when only one exists

Avoid adding a heavy animation dependency beyond what the repo already uses.

- [ ] **Step 4: Integrate without regressing layout**

Ensure:

- desktop and mobile layouts still work
- no layout shift from changing image heights
- album pages still feel fast

- [ ] **Step 5: Verify visual consistency**

Manual review:

- slideshow feels related to the hero but not duplicated awkwardly
- albums with few photos still render well
- no broken images when an album lacks enough assets

Run:

```powershell
npm run build
```

Expected:

- build succeeds
- slideshow component does not break SSR/hydration boundaries

---

## Recommended Milestones

### Milestone 1: Upload safety baseline

- Task 1: Enforce Required Upload Destination
- Task 2: Add Post-Upload Album Reassignment

Release value:

- prevents common mistakes
- gives admin an immediate recovery path

### Milestone 2: Upload reliability

- Task 3: Harden Large Upload Behavior

Release value:

- reduces crashes and refresh-required failures

### Milestone 3: Admin productization

- Task 4: Productize the Admin Dashboard
- Task 5: Add Owner Replies To Viewer Comments

Release value:

- makes the backend feel production-ready
- enables owner-to-viewer interaction

### Milestone 4: Visual polish

- Task 6: Add Album Cover Random Slideshow

Release value:

- improves album preview quality and site identity

---

## Verification Checklist

- [ ] Upload form blocks missing destination in both client and server paths
- [ ] Admin can move wrongly uploaded photos to another album
- [ ] Oversized upload batches fail without hanging the page
- [ ] Admin dashboard copy and layout feel production-oriented
- [ ] Admin can reply to viewer comments with one defined owner display name
- [ ] Public photo page displays owner replies correctly
- [ ] Album cover slideshow uses album-owned images and degrades gracefully
- [ ] `npm run build` succeeds after each milestone
- [ ] `.session/verify.ps1` passes before claiming completion

---

## Notes For Execution

- Keep repository parity in mind: this codebase still supports both Prisma-backed and manifest-backed paths in some repositories.
- Do not overbuild multi-admin reply identity for v1.
- Prefer shipping single-photo album reassignment first if bulk move starts to threaten scope.
- If upload batching needs architectural change beyond current server actions, split that work behind a milestone checkpoint rather than forcing it into one large patch.
