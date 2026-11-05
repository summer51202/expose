# User Feedback Backlog

This document consolidates recent user feedback into a product-facing backlog that can be reviewed, prioritized, and converted into implementation tasks.

---

## Summary

Current user feedback is concentrated in six areas:

1. Large multi-image uploads can crash the site.
2. The admin UI still looks like a local-development mockup instead of a production-ready control panel.
3. Albums cannot be corrected or reorganized after upload.
4. Upload destination selection is too easy to miss, which leads to photos being uploaded into the wrong album.
5. Album covers should behave like the hero section and play as a random slideshow using photos from that album.
6. Confirm whether admins can reply to viewer comments, and if so, what responder name is shown.

---

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

### Implementation Status - 2026-04-13

The 2026-04-13 v1 implementation is complete on branch `feat/admin-photo-management-design`.

Delivered:

- Multipage admin backend: `/admin`, `/admin/upload`, `/admin/photos`, `/admin/albums`, `/admin/comments`, `/admin/likes`.
- Upload state correction: album is required, submit is disabled until album and files are selected, and selected files clear after successful upload.
- Upload guardrails: 100 files per batch, 20MB per file, 200MB total batch limit, and a 220MB Server Action body limit.
- Complete uploaded-photo management: all uploaded photos can be filtered, moved individually, or moved in bulk between albums.
- Existing album, comment, and like management flows were preserved on dedicated pages.

Still deferred:

- Resumable/direct-to-R2 upload or true chunked upload with per-file progress if larger production batches are needed.
- Album cover random slideshow.
- Admin replies to viewer comments and responder-name rules.

---

## Development Priority

### P0: Prevent wrong uploads and unblock admin correction

- Feedback 4: Upload destination should require explicit selection before upload.
- Feedback 3: Admin must be able to fix album assignment mistakes after upload.

Why this comes first:
- It directly prevents avoidable operator errors.
- It reduces cleanup cost in the most common content-management flow.
- These two items solve both prevention and recovery for the same operational problem.

### P1: Stabilize core upload workflow

- Feedback 1: Large uploads can crash the site.

Why this comes next:
- Upload reliability is a core admin function.
- Crashes interrupt content operations and can block real usage even when other UI improvements exist.
- This likely needs technical investigation before final UX can be defined.

### P2: Upgrade admin usability and presentation

- Feedback 2: Admin UI still feels like a mockup.
- Feedback 6: Add or define admin reply capability for viewer comments.

Why this sits here:
- These items are important for a production-ready back office.
- They improve confidence and communication, but do not block the base content pipeline as directly as P0/P1.

### P3: Visual enhancement

- Feedback 5: Album cover should become a random slideshow.

Why this is later:
- It improves visual quality and album discoverability.
- It is valuable, but less urgent than reliability and admin workflow fixes.

---

## Implementable Feature List

### P0 Features

#### Feature A: Required upload destination selection

- Replace the current default album selection with an empty placeholder.
- Disable upload submission until an album is selected.
- Show inline validation when the destination album is missing.
- Highlight the destination field more clearly in the upload form.

Acceptance outcome:
- Users cannot upload photos without explicitly choosing a destination album.

#### Feature B: Post-upload album reassignment

- Add admin controls to change the album of an existing photo.
- Support moving a single photo to another album.
- Support bulk move for multiple selected photos.
- Refresh affected admin and public album views after reassignment.

Acceptance outcome:
- Admin can correct wrongly uploaded photos without re-uploading them.

### P1 Features

#### Feature C: Upload stability guardrails

- Add client-side checks for file count and total upload size.
- Add server-side validation for request size and upload batch size.
- Process uploads in smaller batches instead of one oversized request.
- Show clear upload progress and failure messaging.
- Recover gracefully when one file fails without locking the whole page.

Acceptance outcome:
- Large uploads fail predictably with clear feedback, or complete successfully without hanging the page.

### P2 Features

#### Feature D: Production-ready admin dashboard cleanup

- Remove prototype/tutorial-style text that is no longer needed in production.
- Reorganize the admin homepage around real tasks: upload, albums, comments, likes, and maintenance.
- Replace dev-facing copy with concise operator-facing labels and help text.
- Reduce visual noise and make action areas easier to scan.

Acceptance outcome:
- The admin interface reads like a real control panel instead of a guided mockup.

#### Feature E: Owner reply support for viewer comments

- Decide the owner reply display name strategy.
- Add a reply data model for admin-authored responses.
- Add reply action in admin comment management.
- Render owner replies under the related visitor comment on the public photo page.
- Visually distinguish owner replies from viewer comments.

Suggested naming rule:
- Use one fixed display name such as the site owner or brand name unless multi-admin accounts are planned.

Acceptance outcome:
- Admin can reply to viewer comments from the backend, and the public UI shows a clear responder identity.

### P3 Features

#### Feature F: Album cover random slideshow

- Choose slideshow placement: album card, album header, or both.
- Reuse the hero slideshow behavior where technically appropriate.
- Randomly rotate images from the album itself.
- Keep transitions lightweight and avoid heavy client cost on gallery pages.
- Add fallback behavior for albums with very few images.

Acceptance outcome:
- Album covers feel alive and preview the album using its own content.

---

## Suggested Delivery Batches

### Batch 1: Upload safety baseline

- Feature A: Required upload destination selection
- Feature B: Post-upload album reassignment

### Batch 2: Upload reliability

- Feature C: Upload stability guardrails

### Batch 3: Admin productization

- Feature D: Production-ready admin dashboard cleanup
- Feature E: Owner reply support for viewer comments

### Batch 4: Visual polish

- Feature F: Album cover random slideshow

---

## Feedback 1: Large uploads can crash the site

### User feedback
When too many images are uploaded at once, the site can freeze or crash and requires a page refresh. The exact trigger is unclear, but the user suspects it is related to the total image size rather than only the image count.

### Observed problem
- Upload stability appears to degrade when total payload size gets too large.
- Failure mode is severe enough that the page becomes unusable until refreshed.
- The current experience does not clearly communicate safe upload limits.

### User impact
- Failed uploads waste time.
- Users may need to retry the same batch multiple times.
- Trust in the admin workflow drops because the failure feels unpredictable.

### Suggested follow-up
- Investigate request body size, server action limits, image processing memory usage, and client-side upload batching.
- Add explicit upload limits and validation before upload begins.
- Consider chunked/batched upload flow with progress feedback.
- Show a clear error state instead of allowing the page to hang.

### Priority
`High`

---

## Feedback 2: Admin UI still feels like a mockup

### User feedback
The backend/admin interface still contains local-development traces and explanatory or guided mockup content. It does not yet feel like a real production admin control panel.

### Observed problem
- The UI likely still contains placeholder copy, onboarding-style hints, or demo-oriented structure.
- The information architecture may prioritize explanation over day-to-day administration.
- The current presentation may be acceptable for prototyping but not for routine operations.

### User impact
- Operators may feel uncertain about what actions are real versus temporary.
- The admin interface appears unfinished.
- Routine content management becomes slower and less confident.

### Suggested follow-up
- Audit the admin screens for placeholder text, prototype-only sections, and dev-only guidance.
- Replace explanatory mockup framing with task-oriented admin navigation.
- Rework the admin dashboard to focus on real management actions: upload, album selection, album maintenance, and content correction.
- Review labels and layout from an operator workflow perspective rather than a demo perspective.

### Priority
`Medium-High`

---

## Feedback 3: Need album management after upload

### User feedback
If photos are uploaded into the wrong album, the admin cannot currently move them or correct the album assignment. Album management features need to be added.

### Observed problem
- Post-upload correction workflow is missing.
- Album assignment seems too rigid once content is uploaded.
- There is no recovery path for operator mistakes.

### User impact
- A single upload mistake can create significant cleanup work.
- Admins may need database-level/manual fixes or repeated re-uploads.
- Content organization quality is harder to maintain over time.

### Suggested follow-up
- Add album-management capabilities in admin.
- Support moving photos between albums.
- Support editing album assignment for existing photos.
- Consider bulk actions for multi-photo correction.
- Consider album rename, merge, and cover-photo management if these are part of the intended workflow.

### Priority
`High`

---

## Feedback 4: Upload destination should not default to "unclassified"

### User feedback
When selecting the upload destination album, the current default is "unclassified." This is easy to miss, which often leads to uploading into the wrong place. The preferred behavior is for the default selection to be empty, and uploads should be blocked until a destination is explicitly chosen.

### Observed problem
- A default selection hides an important decision.
- The current default creates accidental uploads.
- The form does not force deliberate album selection.

### User impact
- Photos are frequently uploaded to the wrong destination.
- Users only notice the mistake after upload.
- Follow-up cleanup is harder because album correction tools are also missing.

### Suggested follow-up
- Change the upload destination default from "unclassified" to an empty placeholder state.
- Make album selection required before upload is allowed.
- Add inline validation and a visible error message when no destination is selected.
- Consider emphasizing the destination field visually in the upload form.

### Priority
`High`

---

## Recommended Execution Order

1. Prevent mistaken uploads by requiring explicit destination selection.
2. Add album-management tools so mistakes can be corrected safely.
3. Stabilize large-batch upload behavior.
4. Refine the admin UI into a production-oriented control panel.

---

## Notes

- Feedback 3 and Feedback 4 are closely related: one reduces mistakes before upload, and the other provides recovery after mistakes happen.
- Feedback 1 should be validated with real upload-size testing because the current threshold is still unknown.
- Feedback 2 is partly a UX/design cleanup task and may benefit from being handled after the core admin workflow is made reliable.

---

## Feedback 5: Album cover should be a random slideshow

### User feedback
The album cover is expected to behave more like the hero page: instead of a single static image, it should randomly play images from within the album.

### Observed problem
- The current album cover appears too static compared with the visual direction already used on the homepage hero.
- Album pages/cards do not fully showcase the range of work inside each album.
- There is a visual inconsistency between the hero experience and album presentation.

### User impact
- Albums feel less lively and less representative of their actual content.
- Users get less preview value before opening an album.
- The site misses an opportunity to reinforce a consistent visual identity.

### Suggested follow-up
- Define where the slideshow should appear: album list cards, album header, or both.
- Reuse the hero slideshow interaction pattern where appropriate.
- Randomize from photos inside the album while keeping transitions performant.
- Add sensible fallback behavior for albums with only one photo or very few photos.
- Confirm whether the random sequence should rotate per page load, per session, or continuously while visible.

### Priority
`Medium`

---

## Feedback 6: Need admin reply capability for viewer comments

### User feedback
The team wants to confirm whether the admin can currently reply to viewer comments in the backend. If reply is already supported, the responder name also needs to be clearly defined.

### Current status check
- The current admin comment area is a moderation list, not a conversation/reply interface.
- Existing backend action only supports deleting comments.
- Public comment creation currently stores the visitor-provided nickname only.
- There is no reply model, no admin reply action, and no responder-display rule in the current implementation.

### Observed problem
- Comment management is currently one-way moderation only.
- There is no way for the site owner to publicly respond from the backend.
- Even if reply UI were added later, responder identity rules are still undefined.

### User impact
- Visitor interaction stops at comment submission.
- The site owner cannot answer questions or acknowledge comments in-context.
- If reply support is added without a naming rule, the presentation could become inconsistent or confusing.

### Suggested follow-up
- Decide whether admin replies should be supported as a product feature.
- If yes, define the reply identity model clearly: fixed site-owner name, admin-configured display name, or per-account name.
- Add backend data structure for threaded replies or owner responses.
- Add admin UI for posting replies, not only deleting comments.
- Define how owner replies should appear on the public photo page so they are visually distinct from visitor comments.

### Priority
`Medium`

---

## Feedback 7: Reduce direct photo download exposure

### User feedback
The site should make it harder for visitors to directly download photos.

### Current status check
- Public pages render image URLs in the browser.
- Uploaded image assets are stored with original, medium, and thumbnail variants.
- R2 public URLs may expose direct asset access depending on current storage configuration.
- There is no current download-protection policy, watermarking flow, signed URL flow, or admin setting for public image exposure.
- Phase 1 should be treated as application-level exposure reduction only: public pages should not send `originalUrl` or `originalKey` to the browser, but public or predictable R2 original object URLs remain a residual storage risk until a Phase 2 R2 privatization or signed/proxied access phase.

### Important constraint
This feature cannot provide absolute download prevention. Any image displayed in a browser can still be captured through screenshots, browser cache, devtools, or network inspection. The product goal should be reducing casual downloads and avoiding public exposure of original-resolution assets.

### Observed problem
- Visitors may be able to save or inspect public image URLs directly.
- Original-resolution URLs should not be treated as safe for public display.
- There is no clear distinction between public display assets and protected/private source assets.

### User impact
- Photographers have less control over public image reuse.
- High-resolution images may be exposed more broadly than intended.
- The site lacks a visible protection posture for client-facing photo delivery.

### Suggested follow-up
- Define a public image policy: public pages should use medium or watermarked assets, not original assets.
- Consider disabling obvious browser affordances such as drag-save and context-menu save on gallery images, while documenting that this is only friction.
- Consider a watermark pipeline for public display variants.
- Consider private R2 originals plus signed or proxied access for admin-only original downloads.
- Review `next/image` and R2 URL behavior so public pages do not leak original asset URLs through props or markup.
- Add admin-facing settings or documentation for public image size, watermark, and original-file exposure.

### Priority
`High`

---

## Feedback 8: Add admin traffic and view-count analytics

### User feedback
The admin backend should show traffic and view-count statistics.

### Current status check
- The current admin area focuses on upload, photos, albums, comments, and likes.
- There is no event model for page views, album views, gallery opens, photo impressions, or unique visitors.
- There is no admin analytics dashboard or reporting UI.

### Observed problem
- The site owner cannot see which albums or photos are being viewed.
- Likes and comments do not provide enough visibility into silent traffic.
- There is no way to compare portfolio interest across albums or photos.

### User impact
- Content decisions are harder because there is no traffic feedback loop.
- The admin cannot identify popular albums, under-viewed albums, or recent viewing trends.
- Gallery Mode optimization cannot be measured without view/open events.

### Suggested follow-up
- Define analytics event semantics before implementation:
  - `album_view`: album page loaded
  - `gallery_open`: visitor switches to Gallery Mode
  - `photo_detail_view`: photo detail page loaded
  - `photo_impression`: photo actively visible for a minimum duration
  - `unique_visitor`: privacy-safe visitor/session estimate
- Add a persistence model for daily aggregate counts and optional raw events if needed.
- Add privacy-conscious visitor deduplication, such as session cookie or hashed IP/user-agent with retention limits.
- Add admin dashboard cards for total views, unique visitors, top albums, top photos, and recent trend.
- Separate bot filtering and admin self-traffic rules from the first implementation decision.

### First-release implementation note
The first implementation is scoped to whole-site daily aggregate analytics:

- `/admin/analytics` shows today, week, month, year, and latest 30 daily totals.
- Metrics include page views and distinct visitors.
- Admin traffic is excluded.
- Daily aggregate storage is intentional; future detailed analytics requires raw event storage.
- The storage model keeps `path` and `pageType`, but top-page/top-photo reporting will need query and UI upgrades because the first page only reports whole-site totals.

### Priority
`Medium-High`
