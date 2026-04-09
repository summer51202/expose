# Security Remediation Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the security remediation backlog for `SEC-001` through `SEC-006`, prioritizing the immediate production hardening items first and leaving the codebase ready for follow-up hardening.

**Architecture:** Add a small reusable in-memory abuse-control layer for immediate protections, then harden public and admin entry points with generic error handling and browser security headers. Near-term items build on the same boundaries by tightening identity hashing, upload validation, and internal error hygiene.

**Tech Stack:** Next.js 16, React 19, TypeScript, Server Actions, Prisma, SQLite, Cloudflare R2, PowerShell verify scripts

---

## Scope

### Immediate
- `SEC-001`: protect `loginAction` against brute-force attempts
- `SEC-002`: add abuse throttling to public comment and like actions
- `SEC-004`: add baseline security headers and CSP

### Near-term
- `SEC-003`: stop exposing low-level upload/storage errors to admin UI
- `SEC-005`: strengthen commenter identity hashing
- `SEC-006`: add upload fail-fast guards against oversized or malformed images

---

## File Map

### Existing files expected to change
- `src/app/admin/login/actions.ts`
- `src/app/admin/upload-actions.ts`
- `src/app/photos/comment-actions.ts`
- `src/app/photos/like-actions.ts`
- `src/lib/comments/identity.ts`
- `src/lib/uploads/image-pipeline.ts`
- `src/lib/uploads/upload-service.ts`
- `src/lib/storage/r2-driver.ts`
- `next.config.ts`
- `.env.example`
- `docs/security/security-remediation-backlog.md`

### New files recommended
- `src/lib/security/rate-limit.ts`
- `src/lib/security/request-fingerprint.ts`
- `src/lib/security/security-headers.ts`
- `src/lib/security/errors.ts`
- `src/lib/security/rate-limit.test.ts`
- `src/lib/security/security-headers.test.ts`
- `src/lib/comments/identity.test.ts`
- `src/lib/uploads/upload-guards.test.ts`

---

## Execution Order

1. Implement `SEC-001`, `SEC-002`, and `SEC-004` first.
2. Verify the site still builds and the protected actions return safe user-facing messages.
3. Implement `SEC-003`, `SEC-005`, and `SEC-006`.
4. Re-run verification and update backlog status notes.

---

## Immediate Work

### Task 1: Build a reusable in-memory limiter for immediate abuse controls

**Files:**
- Create: `src/lib/security/rate-limit.ts`
- Create: `src/lib/security/request-fingerprint.ts`
- Test: `src/lib/security/rate-limit.test.ts`

- [ ] **Step 1: Write the failing tests for the limiter behavior**

Cover these cases:
- allows requests under the configured threshold
- blocks when the threshold is exceeded inside the window
- resets after the window expires
- supports independent keys for different identities
- supports temporary cooldown metadata for blocked responses

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/lib/security/rate-limit.test.ts`
Expected: failing assertions because the limiter implementation does not exist yet.

- [ ] **Step 3: Implement the in-memory limiter**

Implementation requirements:
- use a module-scoped `Map<string, Entry>`
- track `count`, `windowStart`, and optional `blockedUntil`
- expose a small API such as `checkRateLimit({ key, limit, windowMs, blockMs })`
- return structured results like `allowed`, `remaining`, `retryAfterMs`
- add lazy cleanup for expired entries to keep memory bounded

- [ ] **Step 4: Implement request fingerprint helpers**

Add helpers that:
- read `x-forwarded-for`, `x-real-ip`, and `user-agent`
- normalize blank or missing values safely
- generate stable keys for login, comments, and likes without storing raw IPs in the limiter key

- [ ] **Step 5: Re-run the limiter tests**

Run: `npx tsx --test src/lib/security/rate-limit.test.ts`
Expected: all limiter tests pass.

- [ ] **Step 6: Commit**

Suggested commit: `git commit -m "feat(security): add in-memory rate limiting primitives"`

---

### Task 2: Implement `SEC-001` admin login protection

**Files:**
- Modify: `src/app/admin/login/actions.ts`
- Reuse: `src/lib/security/rate-limit.ts`
- Reuse: `src/lib/security/request-fingerprint.ts`

- [ ] **Step 1: Write the failing auth-abuse tests or fixtures**

If the project does not yet have action-level tests, add focused tests around the extracted limiter helpers rather than full Next.js action harnesses.

Required behaviors:
- repeated failed login attempts from the same identity are throttled
- the throttle key includes both network identity and username dimension
- blocked responses return a generic safe message
- successful login clears or relaxes the failure state for that user key

- [ ] **Step 2: Run the tests to verify they fail**

Run the targeted security tests only.
Expected: the login protection expectations fail before the action is wired up.

- [ ] **Step 3: Wire rate limiting into `loginAction`**

Implementation requirements:
- build keys from normalized IP fingerprint plus attempted username
- rate limit before credential verification
- increment failure counters only on failed login
- return one generic message for invalid credentials and temporary throttling
- avoid revealing whether username or password was wrong

- [ ] **Step 4: Add minimal observability hooks**

Do one of the following:
- return a generic throttled state without logging secrets, or
- log only safe metadata such as limiter event type and coarse identity hash

Do not log raw passwords, raw cookies, or raw forwarded IP values.

- [ ] **Step 5: Re-run targeted tests**

Expected:
- brute-force attempts become temporarily blocked
- normal login flow still succeeds

- [ ] **Step 6: Commit**

Suggested commit: `git commit -m "fix(security): throttle admin login attempts"`

---

### Task 3: Implement `SEC-002` throttling for comments and likes

**Files:**
- Modify: `src/app/photos/comment-actions.ts`
- Modify: `src/app/photos/like-actions.ts`
- Reuse: `src/lib/security/rate-limit.ts`
- Reuse: `src/lib/security/request-fingerprint.ts`

- [ ] **Step 1: Write the failing public-action abuse tests**

Cover:
- comments are throttled by request identity and per-photo scope
- likes are throttled or deduplicated to prevent rapid toggle abuse
- blocked requests return generic user-facing feedback
- normal comment submission still succeeds under the threshold

- [ ] **Step 2: Run the tests to verify they fail**

Run the targeted tests only.
Expected: failures show no throttling is active yet.

- [ ] **Step 3: Add comment throttling**

Implementation requirements:
- key on request identity plus `photoSource/photoId`
- use a lower threshold than login, with a clear cooldown
- return a neutral message such as "Please wait before trying again"
- keep existing validation for nickname/content lengths

- [ ] **Step 4: Add like abuse suppression**

Implementation requirements:
- key on request identity plus `photoSource/photoId`
- prevent high-frequency toggling bursts
- preserve current dedupe-by-visitor behavior
- avoid introducing a permanent lock when users perform normal interactions

- [ ] **Step 5: Re-run targeted tests**

Expected:
- spammy comment and like bursts are throttled
- ordinary single interactions still work

- [ ] **Step 6: Commit**

Suggested commit: `git commit -m "fix(security): add abuse throttling to public interactions"`

---

### Task 4: Implement `SEC-004` baseline security headers and CSP

**Files:**
- Modify: `next.config.ts`
- Create: `src/lib/security/security-headers.ts`
- Test: `src/lib/security/security-headers.test.ts`

- [ ] **Step 1: Write failing tests for header generation**

Cover:
- `Content-Security-Policy` exists and is deterministic
- `X-Content-Type-Options` is `nosniff`
- `Referrer-Policy` is `strict-origin-when-cross-origin`
- frame protection is present
- `Permissions-Policy` exists with restrictive defaults

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/lib/security/security-headers.test.ts`
Expected: failures because the helper/config does not exist yet.

- [ ] **Step 3: Implement a shared security-header builder**

Recommended defaults:
- CSP with `'self'` baseline
- `frame-ancestors 'none'`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`
- allow only the minimum image/connect origins already required by the app

Keep the policy strict but compatible with Next.js runtime needs. Avoid adding broad wildcards unless required by real runtime behavior.

- [ ] **Step 4: Wire headers into `next.config.ts`**

Implementation requirements:
- export an async `headers()` config
- apply the headers site-wide
- keep existing `images.remotePatterns` behavior
- preserve existing server action body size settings unless a follow-up task changes them

- [ ] **Step 5: Re-run header tests and do a local runtime check**

Verification:
- unit tests pass
- `npm run build` still succeeds
- later manual/live verification checks the actual response headers from Railway

- [ ] **Step 6: Commit**

Suggested commit: `git commit -m "fix(security): add baseline response security headers"`

---

## Near-term Work

### Task 5: Implement `SEC-003` generic admin upload error handling

**Files:**
- Modify: `src/app/admin/upload-actions.ts`
- Modify: `src/lib/storage/r2-driver.ts`
- Create: `src/lib/security/errors.ts`

- [ ] **Step 1: Write failing tests around error mapping**

Cover:
- provider/network/storage failures are mapped to generic admin-safe messages
- validation failures that users can act on remain specific
- raw provider response bodies never surface directly to UI state

- [ ] **Step 2: Run the tests to verify they fail**

Expected: current implementation leaks `error.message`.

- [ ] **Step 3: Add typed internal error categories**

Suggested categories:
- `UploadValidationError`
- `UploadStorageError`
- `UploadProcessingError`

Map each category to:
- safe user-facing message
- optional internal cause for server-side debugging

- [ ] **Step 4: Update `uploadPhotosAction` and storage driver**

Implementation requirements:
- `uploadPhotosAction` returns only generic safe text for infrastructure failures
- `r2-driver` throws typed internal errors instead of raw response text reaching the UI
- keep actionable validation messages for bad file type, bad file count, or bad size when appropriate

- [ ] **Step 5: Re-run tests and manual upload smoke check**

Expected:
- admins no longer see low-level storage provider detail
- operational debugging remains possible from server-side context

- [ ] **Step 6: Commit**

Suggested commit: `git commit -m "fix(security): sanitize admin upload error messages"`

---

### Task 6: Implement `SEC-005` stronger commenter identity hashing

**Files:**
- Modify: `src/lib/comments/identity.ts`
- Modify: `.env.example`
- Test: `src/lib/comments/identity.test.ts`

- [ ] **Step 1: Write failing tests for identity hashing**

Cover:
- hash output changes when the secret changes
- same input with the same secret is stable
- blank inputs still produce deterministic pseudonymous output
- raw IP strings are not returned or persisted

- [ ] **Step 2: Run the tests to verify they fail**

Run the targeted identity tests only.
Expected: failure because current implementation uses plain SHA-256 without a secret.

- [ ] **Step 3: Replace plain hashing with HMAC-based hashing**

Implementation requirements:
- use an env-backed secret such as `COMMENT_IDENTITY_SECRET`
- use HMAC-SHA256 instead of unhashed concatenation
- normalize forwarded IP extraction before hashing
- retain the same return shape for repository callers

- [ ] **Step 4: Document configuration**

Update `.env.example` with:
- placeholder for `COMMENT_IDENTITY_SECRET`
- note that production must set a unique secret

- [ ] **Step 5: Re-run tests**

Expected: identity hashing is stable, secret-backed, and pseudonymous.

- [ ] **Step 6: Commit**

Suggested commit: `git commit -m "fix(security): harden comment identity hashing"`

---

### Task 7: Implement `SEC-006` upload fail-fast guards

**Files:**
- Modify: `src/lib/uploads/image-pipeline.ts`
- Modify: `src/lib/uploads/upload-service.ts`
- Test: `src/lib/uploads/upload-guards.test.ts`

- [ ] **Step 1: Write failing upload guard tests**

Cover:
- rejects files above the allowed byte size before expensive processing
- rejects unsupported MIME types or extensions
- rejects absurd image dimensions or decode metadata when available
- rejects too many files in a single request

- [ ] **Step 2: Run the tests to verify they fail**

Expected: current pipeline accepts overly large or weakly screened input.

- [ ] **Step 3: Add fail-fast validation before transform/upload**

Implementation requirements:
- enforce max file size
- enforce max file count
- enforce explicit allowlist for image MIME types
- add dimension or pixel-count guard after metadata probe and before full processing

- [ ] **Step 4: Preserve safe, actionable validation messages**

Users should get specific messages for:
- too many files
- file too large
- unsupported format

Infrastructure or transform internals should still remain generic under `SEC-003`.

- [ ] **Step 5: Re-run upload guard tests**

Expected: invalid payloads fail fast and valid uploads still proceed.

- [ ] **Step 6: Commit**

Suggested commit: `git commit -m "fix(security): add upload fail-fast guards"`

---

## Verification Checklist

- [ ] `npx eslint .`
- [ ] `npx tsc --noEmit`
- [ ] `.session/verify.ps1`
- [ ] targeted security tests for limiter, headers, identity hashing, and upload guards
- [ ] local smoke check of `/admin/login`
- [ ] local smoke check of comment submission and like toggle
- [ ] live response header check after deployment on Railway

---

## Rollout Notes

- The immediate limiter is intentionally in-memory and suitable for a single-instance Railway deployment.
- If the app later scales beyond one instance, replace the limiter storage backend with a shared store such as Redis or a managed KV.
- Keep generic user-facing messages even after the near-term work lands; internal causes should stay server-side.
- After `SEC-004` is deployed, re-check the site for CSP breakage on images, scripts, forms, and admin actions before tightening the policy further.

---

## Backlog Mapping

| Backlog Item | Plan Task |
| --- | --- |
| `SEC-001` | Task 2 |
| `SEC-002` | Task 3 |
| `SEC-004` | Task 4 |
| `SEC-003` | Task 5 |
| `SEC-005` | Task 6 |
| `SEC-006` | Task 7 |
