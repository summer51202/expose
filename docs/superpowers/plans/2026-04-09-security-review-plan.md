# Expose Security Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Review the production security posture of the Expose photo site, identify exploitable weaknesses, rank them by risk, and produce a remediation backlog the engineering team can execute.

**Architecture:** Review the system from the outside in: establish the deployed surface and trust boundaries first, then inspect auth, admin actions, upload processing, data handling, storage, and deployment configuration. Finish by converting findings into a severity-ranked backlog with owners and verification steps.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma, SQLite, Cloudflare R2, Server Actions, cookie-based admin session, PowerShell verify scripts

---

## File Map

### Existing files to read for review context
- `AGENTS.md`
- `CLAUDE.md`
- `.session/features.json`
- `.session/progress.md`
- `.session/verify.ps1`
- `README.md`
- `docs/design/architecture.md`
- `docs/runbooks/launch-checklist.md`
- `docs/design/p1-auth-data-storage-design.md`
- `next.config.ts`
- `.env.example`
- `prisma/schema.prisma`
- `src/lib/auth/config.ts`
- `src/lib/auth/credentials.ts`
- `src/lib/auth/session.ts`
- `src/app/admin/login/actions.ts`
- `src/app/admin/login/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/upload-actions.ts`
- `src/app/admin/album-actions.ts`
- `src/app/admin/engagement-actions.ts`
- `src/app/photos/comment-actions.ts`
- `src/app/photos/like-actions.ts`
- `src/lib/uploads/image-pipeline.ts`
- `src/lib/uploads/upload-service.ts`
- `src/lib/storage/r2-driver.ts`
- `src/lib/storage/provider.ts`
- `src/lib/photos/repository.ts`
- `src/lib/albums/repository.ts`
- `src/lib/comments/repository.ts`
- `src/lib/likes/repository.ts`
- `src/lib/comments/identity.ts`
- `src/lib/likes/identity.ts`

### New files to create during the review
- `docs/security/security-review-report.md`
- `docs/security/security-risk-register.md`
- `docs/security/security-remediation-backlog.md`

---

## Phase 1: Review Baseline And Threat Model

### Task 1: Define the review scope and operating assumptions

**Files:**
- Read: `docs/design/architecture.md`
- Read: `docs/runbooks/launch-checklist.md`
- Read: `.env.example`
- Create: `docs/security/security-review-report.md`

- [ ] **Step 1: Record the current deployment assumptions**

Document:
- production hostname
- hosting provider
- admin entry point
- database type in production
- object storage exposure model
- whether comments and likes are publicly writable

- [ ] **Step 2: Write the system trust boundaries**

Capture these boundaries in `docs/security/security-review-report.md`:
- browser to public site
- browser to `/admin`
- public forms to server actions
- app server to SQLite database
- app server to Cloudflare R2
- environment variables to runtime

- [ ] **Step 3: Define the attacker profiles**

Use these minimum attacker profiles:
- anonymous internet visitor
- authenticated admin with stolen browser session
- malicious uploader abusing file processing
- spammer abusing comments or likes
- operator mistake leaking secrets or weakening config

- [ ] **Step 4: Define severity criteria before reviewing code**

Use this scale:
- `Critical`: auth bypass, secret exposure, arbitrary file write, stored XSS in public pages
- `High`: admin-only action reachable by unauthenticated users, unsafe upload leading to harmful content or denial of service, weak production credential handling
- `Medium`: missing hardening headers, missing rate limiting, privacy leakage, excessive error detail
- `Low`: observability gaps, incomplete docs, weak defaults not currently reachable in production

---

## Phase 2: Authentication And Authorization Review

### Task 2: Verify admin authentication is safe in production

**Files:**
- Read: `src/lib/auth/config.ts`
- Read: `src/lib/auth/credentials.ts`
- Read: `src/lib/auth/session.ts`
- Read: `src/app/admin/login/actions.ts`
- Read: `src/app/admin/login/page.tsx`
- Read: `src/app/admin/page.tsx`
- Update: `docs/security/security-review-report.md`

- [ ] **Step 1: Inspect credential source and fail-fast behavior**

Review for:
- default credentials blocked in production
- fallback `AUTH_SECRET` blocked in production
- startup failure when required auth env vars are missing
- no credential values ever rendered to logs or UI

Run:

```powershell
Get-Content src\lib\auth\config.ts
Get-Content src\lib\auth\credentials.ts
```

Expected: production code rejects default username, default password, and fallback secret.

- [ ] **Step 2: Inspect session cookie properties**

Review for:
- `httpOnly`
- `secure` in production
- `sameSite`
- explicit expiry or max age
- signature validation
- rejection of malformed payloads

Run:

```powershell
Get-Content src\lib\auth\session.ts
```

Expected: cookie is signed, validated, and uses production-safe flags.

- [ ] **Step 3: Verify all admin surfaces enforce auth close to the mutation**

Check these files for `requireAdminSession()` or equivalent:
- `src/app/admin/page.tsx`
- `src/app/admin/upload-actions.ts`
- `src/app/admin/album-actions.ts`
- `src/app/admin/engagement-actions.ts`

Run:

```powershell
rg -n "requireAdminSession|getAdminSession|redirect\\(\"/admin/login" src/app/admin src/lib/auth -S
```

Expected: every admin page and every admin server action performs an explicit authorization check.

- [ ] **Step 4: Check for auth bypass paths**

Review for:
- route handlers under admin path without auth
- action helpers called by public code without auth guard
- layout-only protection without action-level verification
- sensitive admin data prefetched before session check

- [ ] **Step 5: Record findings and remediation**

For each finding, write:
- affected file
- exploit path
- impact
- recommended fix
- severity

---

## Phase 3: Public Input, XSS, And Abuse Review

### Task 3: Review comments, likes, and other public writes

**Files:**
- Read: `src/app/photos/comment-actions.ts`
- Read: `src/app/photos/like-actions.ts`
- Read: `src/lib/comments/repository.ts`
- Read: `src/lib/likes/repository.ts`
- Read: `src/lib/comments/identity.ts`
- Read: `src/lib/likes/identity.ts`
- Update: `docs/security/security-review-report.md`

- [ ] **Step 1: Inspect user-controlled fields**

Review these inputs:
- comment nickname
- comment content
- like toggles
- photo id and source parameters

Check for:
- length limits
- empty value rejection
- server-side validation
- type validation
- output encoding by default rendering path

- [ ] **Step 2: Review XSS exposure paths**

Search for dangerous rendering patterns:

```powershell
rg -n "dangerouslySetInnerHTML|innerHTML|new Function|eval\\(" src -S
```

Expected: no dangerous HTML rendering path for user-controlled content.

- [ ] **Step 3: Review spam and abuse controls**

Check whether the app has:
- rate limiting
- cooldowns
- bot protection
- duplicate suppression
- moderation workflow

Expected: if controls do not exist, log this as at least `Medium` because production public write endpoints invite abuse.

- [ ] **Step 4: Review privacy handling of commenter and liker identity**

Verify:
- IP-derived identifiers are hashed before storage
- raw IP is not persisted
- hash strategy is documented
- retention and deletion expectations are understood

- [ ] **Step 5: Manually test public write behavior**

Manual checks:
- submit oversized comment
- submit HTML or script-like comment payload
- spam repeated likes from same browser
- inspect whether error messages leak internals

Expected: payloads are safely handled, output remains encoded, and errors are generic.

---

## Phase 4: Upload And File Processing Review

### Task 4: Review the upload pipeline for file handling risks

**Files:**
- Read: `src/app/admin/upload-actions.ts`
- Read: `src/lib/uploads/image-pipeline.ts`
- Read: `src/lib/uploads/upload-service.ts`
- Read: `src/lib/storage/provider.ts`
- Read: `src/lib/storage/r2-driver.ts`
- Update: `docs/security/security-review-report.md`

- [ ] **Step 1: Inspect upload authorization and trust boundary**

Verify:
- upload entrypoint is admin-only
- file processing cannot be reached anonymously
- uploaded metadata is not trusted without validation

- [ ] **Step 2: Review server-side file validation**

Check for:
- MIME validation
- extension validation
- image decoding validation
- file size limit
- file count limit per request
- rejection of non-image payloads

Run:

```powershell
rg -n "sizeLimit|contentType|mime|image|sharp|File|arrayBuffer|Buffer" src/app/admin src/lib/uploads src/lib/storage -S
```

Expected: the pipeline validates uploaded files before persistence and bounds resource usage.

- [ ] **Step 3: Review filename, path, and object-key generation**

Check for:
- path traversal resistance
- predictable or colliding keys
- unsafe reuse of user filename
- overwriting existing objects

Expected: storage keys are generated server-side and never directly derived from raw user path input.

- [ ] **Step 4: Review image transformation failure modes**

Check for:
- decompression bomb risk
- oversized dimensions
- unbounded memory use
- partial write behavior on transform failure
- cleanup behavior when one variant upload succeeds and another fails

- [ ] **Step 5: Review public file serving behavior**

Verify:
- uploaded content is served only as expected image types
- no HTML or script payload can be uploaded and then executed from the public asset domain
- R2 public base URL is intentionally configured

Expected: content type and allowed formats are constrained enough to prevent stored content abuse.

---

## Phase 5: Data Layer, Secrets, And Storage Review

### Task 5: Review data persistence and secret management

**Files:**
- Read: `prisma/schema.prisma`
- Read: `src/lib/prisma.ts`
- Read: `src/lib/photos/repository.ts`
- Read: `src/lib/albums/repository.ts`
- Read: `src/lib/comments/repository.ts`
- Read: `src/lib/likes/repository.ts`
- Read: `.env.example`
- Update: `docs/security/security-review-report.md`

- [ ] **Step 1: Review data classification**

Classify stored data into:
- public content
- admin-only operational data
- pseudonymous engagement data
- secrets

- [ ] **Step 2: Review database risks**

Check for:
- direct SQL construction
- insufficient uniqueness constraints for engagement data
- missing referential constraints
- leakage of internal ids where avoidable
- SQLite file placement and backup implications

Run:

```powershell
Get-Content prisma\schema.prisma
rg -n "queryRaw|executeRaw|\\$queryRaw|\\$executeRaw" src -S
```

Expected: no unsafe raw query use, and schema constraints align with expected trust model.

- [ ] **Step 3: Review secrets hygiene**

Verify:
- `.env` is gitignored
- `.env.example` contains placeholders only
- no real credential string appears in repository docs
- log messages do not print secrets

Run:

```powershell
Get-Content .gitignore
Get-Content .env.example
rg -n "R2_SECRET_ACCESS_KEY|AUTH_SECRET|change-me|admin123|secret" . -S
```

Expected: no live secret is committed; any default examples are clearly marked as unsafe for production.

- [ ] **Step 4: Review R2 access design**

Check for:
- least-privilege credential assumptions
- separation between write credential and public URL
- documented key rotation process
- handling of failed uploads and object existence mismatch

- [ ] **Step 5: Review privacy and retention gaps**

Document:
- how long comments and likes should be retained
- whether admin can delete abusive content
- whether deletion removes related records fully enough for policy needs

---

## Phase 6: App Hardening, Headers, And Runtime Configuration

### Task 6: Review framework and deployment hardening

**Files:**
- Read: `next.config.ts`
- Read: `README.md`
- Read: `docs/runbooks/launch-checklist.md`
- Update: `docs/security/security-review-report.md`

- [ ] **Step 1: Review security headers and browser policy gaps**

Check whether the deployment sets or documents:
- `Content-Security-Policy`
- `X-Frame-Options` or `frame-ancestors`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `Permissions-Policy`

Run:

```powershell
Get-Content next.config.ts
rg -n "headers\\(|Content-Security-Policy|X-Frame-Options|Referrer-Policy|Permissions-Policy|X-Content-Type-Options" . -S
```

Expected: if headers are absent, record as hardening gaps with recommended values.

- [ ] **Step 2: Review error handling and information disclosure**

Check for:
- stack traces rendered to users
- low-level storage or DB errors surfaced in action results
- admin-only details rendered on public pages

- [ ] **Step 3: Review CSRF exposure**

Assess:
- whether admin mutations rely only on cookie auth
- whether same-site cookie setting is sufficient
- whether any cross-origin form post could trigger a state-changing action

Expected: if explicit CSRF protection is absent, note the risk and explain whether SameSite meaningfully reduces it.

- [ ] **Step 4: Review brute-force resistance**

Check whether `/admin/login` has:
- retry throttling
- temporary lockout
- logging for repeated failure

Expected: if none exist, record as a production hardening gap.

---

## Phase 7: Dependency, Build, And Operations Review

### Task 7: Review supply chain and operational readiness

**Files:**
- Read: `package.json`
- Read: `package-lock.json`
- Read: `.session/verify.ps1`
- Read: `docs/runbooks/launch-checklist.md`
- Create: `docs/security/security-risk-register.md`
- Create: `docs/security/security-remediation-backlog.md`

- [ ] **Step 1: Review dependency exposure**

Run:

```powershell
Get-Content package.json
```

If networked review is allowed in a later session, also run:

```powershell
npm audit
```

Record:
- high-risk packages handling auth, uploads, parsing, or image processing
- whether dependency update cadence is defined

- [ ] **Step 2: Review logging and incident response gaps**

Check whether the team can answer:
- who logged into admin
- when uploads failed
- when repeated login attempts happened
- which secret rotation steps to follow after compromise

Expected: if the answer is no, record observability and response gaps.

- [ ] **Step 3: Build the security risk register**

For each finding add:
- id
- title
- severity
- attack scenario
- affected asset
- evidence
- remediation summary
- owner
- target milestone

- [ ] **Step 4: Build the remediation backlog**

Organize backlog into:
- `Immediate`: fix before further public promotion
- `Near-term`: fix in next development cycle
- `Later hardening`: important but not launch-blocking

- [ ] **Step 5: Define the re-review cadence**

Document this cadence:
- full manual security review every release milestone
- targeted auth and upload review after any change in those areas
- dependency review monthly
- secrets rotation on suspected exposure and at fixed intervals

---

## Final Deliverables Gate

- [ ] `docs/security/security-review-report.md` exists and includes:
- scope
- trust boundaries
- review methodology
- findings with severity
- remediation recommendations

- [ ] `docs/security/security-risk-register.md` exists and lists all identified risks in a sortable format.

- [ ] `docs/security/security-remediation-backlog.md` exists and groups fixes by urgency and ownership.

- [ ] A final review summary is prepared for the engineering team covering:
- top 3 immediate risks
- what is already acceptable
- what needs code change
- what needs operational process change

---

## Recommended Initial Focus

Start with these areas first because they are the most likely to create production-impacting security issues in this app:

1. Admin auth and session handling
2. Upload validation and public asset serving
3. Public comment and like abuse controls
4. Secret handling and production config
5. Missing security headers and CSRF posture

---

## Self-Review

### Requirements coverage
- The plan covers code review, abuse review, deployment review, storage review, and remediation planning for a production website.

### Placeholder scan
- No `TODO`, `TBD`, or deferred placeholders remain.

### Consistency check
- The plan consistently treats `/admin`, uploads, public writes, SQLite, and R2 as the primary security review surfaces for this repository.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-09-security-review-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
