# Session Progress Log（交班日誌）

> 每個 session 結束時必須更新此檔案。下一個 session 從這裡開始。

---

## 最新狀態摘要

- **目前階段**: Phase 1 — MVP
- **上次完成的 feature**: P1-INIT（專案初始化）
- **下一個應處理的 feature**: 依 features.json 的 priority 排序，挑選 status 為 `not_started` 或 `in_progress` 中 priority 最高者
- **已知阻礙**: 無
- **App 健康狀態**: 待確認（需跑 init.ps1）

---

## Session 記錄

### Session #000 — 初始化 Session Protocol（2026-03-23）

**執行者**: Human + Agent (Initializer)
**目標**: 建立 long-running session protocol 基礎架構
**完成事項**:
- 建立 `.session/` 目錄結構
- 建立 `features.json` feature checklist
- 建立 `progress.md` 交班日誌
- 建立 `init.ps1` 環境初始化腳本
- 建立 `verify.ps1` smoke test 驗證腳本
- 更新 `CLAUDE.md` session protocol
- 更新 `AGENTS.md` 角色化指引

**當前 codebase 狀態**:
- Next.js 16 + Tailwind 4 + Prisma 6 基礎架構已建立
- 資料層使用 JSON 檔案（data/albums.json, data/photos.json），尚未接 PostgreSQL
- 照片上傳使用本地 uploads/ 目錄，尚未接 R2
- 有基本的 admin login、upload form、photo grid、album 功能
- 首頁有 hero、explainers、album strip、photo wall 四個 section

**遺留問題**:
- JSON 編碼問題：albums.json 中的中文顯示為亂碼（皜祈岫皜祈岫）
- 需確認 auth session 完整流程是否正常
- 尚未建立 git repository

**下一個 session 應做的事**:
1. 初始化 git repository
2. 確認 app 可正常啟動（跑 init.ps1）
3. 從 features.json 挑選最高優先的 in_progress feature 繼續
### Session #001 - 協作文件整理（2026-03-24）
**參與者**: Human + Agent (Coding Agent)
**目標**: 根據 Phase 1 到 Phase 3 規劃與目前實作經驗，整理協作開發文件
**本次產出**:
- 新增 `docs/實作計畫.md`
- 新增 `docs/workflow.md`
- 新增 `docs/architecture.md`
- 新增 `docs/mockups.md`

**本次判斷**:
- 現況已超出原本純規劃階段，部分 Phase 2 / 3 功能已經落地
- 後續文件需要區分「規劃目標」與「實際已實作狀態」
- 現在最需要補的是流程、架構、畫面層級的共同語言，而不是再增加一份抽象 roadmap

**建議後續**:
1. 更新 `.session/features.json` 的狀態，使其與現況一致
2. 若開始做 Prisma / R2 遷移，先更新 `docs/architecture.md`
3. 若頁面版型有大改，先更新 `docs/mockups.md`

---

### Session #002 — UI 沉浸式改版（Direction C）（2026-03-27）

**執行者**: Human + Agent (Coding Agent)
**目標**: 完成 phase-ui 全部 6 個 tickets，讓網站從「開發說明風格」轉型為「攝影展示風格」

**完成 Features**:
- `UI-THEME`：雙主題 CSS token（`:root` light / `[data-theme="dark"]`）+ `(browse)` route group + `photos/layout.tsx` 暗色 layout
- `UI-NAV`：新建 `SiteHeader`（透明 → 捲動後不透明，light/dark 兩種模式）+ 全站 UI 文字英文化
- `UI-HERO`：HeroSection 全出血 100vh + 5s CSS crossfade 輪播 + 移除 ExplainersSection
- `UI-GALLERY`：PhotoCard 移除白色卡片邊框，純照片瀑布流 + hover overlay 動畫；Album Strip 改為漸層封面卡片
- `UI-PHOTOPAGE`：照片詳情頁暗色沉浸式，照片舞台 85vh，Interactions 合併按讚留言，Photo Details collapsible
- `UI-SLIDESHOW`：幻燈片改為 flex column 全黑，底部 FilmStrip（展開縮圖帶 / 收合 dot indicator），Framer Motion crossfade

**額外修復**:
- Bug fix：`next.config.ts` 新增 `serverActions.bodySizeLimit: "50mb"`，修復上傳「Failed to fetch」
- Bug fix：`globals.css` 的 `a { color: inherit }` 改為 `a:not([class])`，修復全站 hover 顏色失效

**當前 codebase 狀態**:
- 首頁：全出血 Hero 照片輪播 + Albums 漸層封面卡片 + Latest Work 純照片瀑布流
- 照片詳情頁：暗色主題（#0c0c0c），照片舞台 85vh，3 個區塊右欄（標題 / Interactions / Photo Details collapsible）
- 幻燈片：全黑全螢幕，Framer Motion 照片切換，底部 FilmStrip 可展開/收合
- 全站 UI 文字統一英文
- TypeScript 0 錯誤

**遺留問題 / 已知限制**:
- Album 封面照目前用漸層 placeholder（`coverPhotoId` 欄位存在但 query 未 join URL）
- `SiteHeader` 在 Hero 上方的透明狀態，淺色頁的 logo 文字顏色在非 Hero 頁面（相簿頁）捲動前稍暗，視覺尚可接受
- Admin 後台 UI 文字仍為中文（本次不在範圍內）

**下一個 session 應做的事**:
1. 從 `features.json` 選下一個 priority 最高的 `not_started` / `in_progress` feature
2. 建議優先考慮：`P1-AUTH`（確認 auth session 完整流程）或 `P1-DATA`（Prisma 遷移）
3. 若要補 Album 封面照功能，需更新 `getAlbums()` query join `coverPhotoUrl`，再更新 `AlbumSummary` 型別與 `AlbumStripSection`
### Session #003 - SQLite Prisma cutover (2026-04-05)
**執行者**: Human + Agent (Coding Agent)
**目標**: 完成 P1-DATA 的最短可用切換，避免本機 PostgreSQL/Docker blocker，讓 app 改由 Prisma + SQLite 讀寫。
**本次變更**:
- 將 `prisma/schema.prisma` 的 datasource 改為 `sqlite`
- 將 Album / Photo / Comment / PhotoLike 的 Prisma ID 與外鍵欄位改為 `BigInt`
- 新增 `src/lib/prisma-id.ts`，在 Prisma repository 邊界處理 `number` / `bigint` 轉換
- 更新 `src/lib/albums/repository.ts`
- 更新 `src/lib/photos/repository.ts`
- 更新 `src/lib/comments/repository.ts`
- 更新 `src/lib/likes/repository.ts`
- 更新 `scripts/migrate-json-to-prisma.mjs` 以支援 BigInt import
- 更新 `.env` 改用 Prisma backend，並將 SQLite DB 放在 Windows `%TEMP%`
- 更新 `docs/launch-checklist.md`，記錄本機 SQLite 路徑 workaround

**驗證結果**:
- `npx prisma generate` 成功
- `npm run data:migrate:prisma` 成功
- `npm run data:verify:prisma` 成功
- `npx eslint .` 成功
- `npx tsc --noEmit` 成功
- `npm run build` 成功
- Prisma smoke query 成功讀到 albums / photos / comments / likes

**重要發現**:
- `prisma migrate dev` 在 SQLite DB 不存在時只回傳空白 `Schema engine error`
- 直接呼叫 schema engine 可看到真實錯誤 `P1003 Database does not exist`
- 這個 workspace 路徑上的 SQLite 會留下 journal 並導致 `disk I/O error`
- 將 SQLite DB 移到 Windows `%TEMP%` 後，Prisma runtime 讀寫恢復正常

**下一步**:
1. 補 admin / browse flow 的手動 smoke test，確認 `/admin`、首頁、相簿頁都走 Prisma 資料源
2. 開始接 Phase 2 的 R2 driver 真實實作
3. 若要讓 Prisma CLI migration 也完全穩定，之後可再研究 Windows workspace 與 SQLite journal 的互動
### Session #004 - Real R2 storage hookup (2026-04-07)
**執行者**: Human + Agent (Coding Agent)
**目標**: 完成 P1-STORAGE，讓 upload flow 真正寫入 Cloudflare R2，而不是停留在 local driver。
**本次變更**:
- 實作 `src/lib/storage/r2-driver.ts`
- 加入 Cloudflare R2 S3-compatible PUT object 流程
- 使用 SigV4 簽名請求上傳 object
- 使用 `R2_PUBLIC_BASE_URL` 組公開讀取 URL
- 修正本機 `.env` 的 `R2_ENDPOINT` 格式
- 將 `.env` 的 `STORAGE_BACKEND` 切到 `r2`

**驗證結果**:
- 真實 smoke upload 成功寫入 R2：
  `uploads/r2-smoke-1775551763639.txt`
- 公開 URL 可讀取成功：
  `https://pub-0f2e8bcffa434ff3b6bb3e14b77516fe.r2.dev/uploads/r2-smoke-1775551763639.txt`
- `npx eslint .` 成功
- `npx tsc --noEmit` 成功
- `npm run build` 成功

**注意事項**:
- 目前第一版使用 public bucket URL 作為 `R2_PUBLIC_BASE_URL`
- 之後若改成自訂圖片網域，只需要更新 `R2_PUBLIC_BASE_URL`
- 先前在對話中曝光過的 R2 access key / secret，正式上線前建議 rotate

**下一步**:
1. 走一次真實圖片上傳 smoke test，確認原圖 / medium / thumb 都寫進 R2 並能在前台顯示
2. 確認舊 local uploads 是否需要搬遷到 R2
3. 若要正式上站，再把 public bucket URL 換成 custom domain
### Session #005 - Legacy uploads migrated to R2 (2026-04-07)
**?瑁???*: Human + Agent (Coding Agent)
**?格?**: 把 Prisma 裡仍指向 `local` 的舊照片資產完整搬到 Cloudflare R2，讓新舊圖片都統一走同一套公開 URL。
**?祆活霈**:
- 執行 `npm run storage:migrate:r2`
- 將 23 筆 `storageProvider="local"` 的 photo 記錄對應的 original / medium / thumbnail 從 `public/uploads` 複製上傳到 R2
- 成功後更新 Prisma 欄位：`originalUrl` / `mediumUrl` / `thumbnailUrl` / `originalKey` / `mediumKey` / `thumbnailKey` / `storageProvider`
- 保留本機 `public/uploads` 原檔作為回滾保險，這次只做 copy + DB cutover，不做刪檔

**撽?蝯?**:
- `npm run storage:migrate:r2` ??嚗?3 筆舊圖搬遷完成
- Prisma 驗證：`localCount = 0`、`r2Count = 24`
- `curl.exe -I <migrated-medium-url>` ?? `HTTP/1.1 200 OK`

**瘜冽?鈭?**:
- 現在新圖與舊圖都統一由 R2 提供公開讀取 URL
- `public/uploads` 仍保留，可等整站再驗一次後決定是否清理

**銝?甇?*:
1. 實際在前台首頁 / 相簿頁 / 照片頁抽查幾張舊圖，確認都顯示正常
2. 正式上線前 rotate 已曝光過的 R2 access key / secret
3. 之後若要把 `r2.dev` 換成 `img.<your-domain>`，只需切 `R2_PUBLIC_BASE_URL`
### Session #006 - Admin Multipage Photo Management (2026-04-13)
**Role**: Human + Agent (Coding Agent)
**Goal**: Implement the 2026-04-13 v1 plan for multipage admin, complete uploaded-photo management, and upload state fixes.

**Completed**:
- Added shared admin shell and split admin workflows into `/admin/upload`, `/admin/photos`, `/admin/albums`, `/admin/comments`, and `/admin/likes`.
- Converted `/admin` into a task dashboard with stats, workflow links, and recent uploads.
- Added upload guardrails: required destination album, 24-file batch limit, 20MB single-file limit, 200MB total limit, and 220MB Server Action body limit.
- Updated upload form state so successful uploads clear the selected file input and selected-file list while keeping the album selection.
- Extended both manifest and Prisma photo repositories with single and bulk album reassignment support.
- Added admin photo move Server Actions with session checks, album/photo validation, and affected path revalidation.
- Added `/admin/photos` management UI with album filtering, row-level moves, bulk selection, and bulk moves.

**Verification**:
- `npm run build` passed after each implementation phase.
- Final `.session/verify.ps1` passed on 2026-04-13 after cleaning stale verify build output.

**Follow-up adjustment**:
- Upload count guardrail was raised from 24 to 100 photos per batch to match the operator habit of uploading 50-100 photos at once while keeping the 200MB total batch limit.

### Session #007 - Admin Analytics First Release (2026-04-18)
**Role**: Human + Agent (Coding Agent)
**Goal**: Add first-release admin page-view analytics with daily whole-site reporting.

**Completed**:
- Added timezone-aware analytics date helpers and shared analytics report types.
- Added daily aggregate analytics storage for Prisma and the JSON backend, keeping `path` and `pageType` for future upgrades.
- Added resilient public page-view tracking that skips admin sessions and swallows analytics write failures.
- Wired tracking into home, album detail, and photo detail pages after 404 checks.
- Added `/admin/analytics` with today, week, month, year, and latest 30 daily page-view and distinct-visitor totals.
- Added admin navigation entry for the analytics page.
- Documented first-release scope and future raw-event/top-page upgrade limits in the feedback backlog.

**Verification**:
- Focused analytics tests passed: `node --import tsx --test src/lib/analytics/date.test.ts src/lib/analytics/tracker.test.ts src/lib/analytics/queries.test.ts`.
- Prisma Client generation passed: `npx prisma generate`.
- Full session verification passed: `.session/verify.ps1`.

**Notes**:
- Implementation commits are on `feat/admin-analytics-impl`, not `master`.
- `features.json` was not updated because there is no dedicated analytics feature entry and the existing structure should not be changed.

### Session #008 - SEO & Share Previews (2026-11-05)
**Role**: Human + Agent (Coding Agent)
**Goal**: Make pages discoverable and give every public page a proper link preview (IG / FB / LINE / X).

**Completed**:
- Root `metadataBase` (from new `SITE_URL` env, falling back to `RAILWAY_PUBLIC_DOMAIN`, then localhost), title template `%s · Expose`, default Open Graph + Twitter `summary_large_image`.
- `generateMetadata` for `/photos/[source]/[id]` and `/albums/[slug]`: title, description (custom text or generated fallback), canonical URL without the `returnAlbum` / `view` / `photo` navigation params, Open Graph + Twitter fields.
- `opengraph-image.ts` for home (latest upload), album (cover photo → first photo) and photo pages: 1200×630 JPEG via sharp with attention-based crop. JPEG on purpose because LINE does not render WebP previews. Dark fallback image if the source cannot be loaded.
- Image source loading is restricted to files under `public/` and the `R2_PUBLIC_BASE_URL` host (no open fetch proxy).
- `sitemap.xml` (home, non-empty albums, uploaded photos, with image entries) and `robots.txt` (disallow `/admin`, `/api/`).
- `noindex` for `/admin/*` and sample placeholder photos.
- `getPhotoBySourceAndId` / `getAlbumPageData` wrapped in React `cache()` so metadata and page share one lookup per request.
- `SITE_URL` added to `.env.example` and the Railway runbook.

**Verification**:
- `node --import tsx --test src/lib/seo/seo.test.ts` passed (8 tests, incl. path-traversal and host allowlist checks).
- `.session/verify.ps1 -Feature "SEO"` → ALL CHECKS PASSED (after deleting stale April build outputs `.next-build/` and `.next-build-output/`, whose old generated route types broke `tsc`).
- Manual run on `DATA_BACKEND=json STORAGE_BACKEND=local`: head tags, canonical, robots, sitemap, and all three OG images (200, image/jpeg, 1200×630) checked; missing photo OG → 404.

**Known issues / not verified**:
- Local Prisma SQLite (`.env` DATA_BACKEND=prisma) has no tables, so the Prisma + R2 path was not exercised locally. Check on Railway: `/sitemap.xml`, `/opengraph-image`, and one photo's `/opengraph-image` (fetches from R2).
- In `next dev`, `og:image` uses the request host; in production it uses `metadataBase`, so `SITE_URL` must be set on Railway (or rely on `RAILWAY_PUBLIC_DOMAIN`).
- `features.json` has no SEO entry, so it was not updated (structure must not change).
- `<html lang="en">` left as-is; decide later whether the site is English- or Chinese-first.

**Next**:
1. Deploy, set `SITE_URL`, and test a photo link with Facebook Sharing Debugger and LINE.
2. Submit `sitemap.xml` in Google Search Console.
3. Next feature candidate: add a high-resolution (≈2560px) image derivative; hero and photo page currently use the 1200px `medium`.

---

### Session #009 - Large (2560px) Image Derivative (2026-11-05)
**Role**: Human + Agent (Coding Agent)
**Goal**: Stop hero / photo page / album playback from upscaling the 1200px `medium` on 2K, 4K and Retina screens.

**Branch decision**: Option (a). `feat/public-image-exposure-reduction` was merged into this branch first (one conflict in `src/lib/photos/queries.ts`: kept Session #008's React `cache()` and mapped results through `toPublicPhoto`). This PR therefore also lands the public photo DTO / casual-save-reduction work.

**Completed**:
- Upload pipeline renders `large`: fit inside 2560×2560, `withoutEnlargement`, WebP q85. Specs live in `src/lib/uploads/image-derivatives.ts` (`IMAGE_DERIVATIVES`).
- `Photo.largeUrl` / `largeKey` (migration `20261105000000_photo_large_derivative`), `GalleryPhoto.largeUrl`, `PhotoRecord.largeKey`, both repositories, JSON manifest (pass-through), public DTO exposes `largeUrl` only (no key).
- `getDisplayImageUrl(photo, "large" | "medium")` in `src/lib/photos/display-image.ts`: large falls back to medium.
- Hero and album playback (`gallery-image-stage`) use large. `PhotoStage` has `variant` + `sizes` props: detail page passes `variant="large"` and a `sizes` that matches its real column width (`(min-width: 1280px) 812px, (min-width: 1024px) 62vw, 100vw`); grid cards keep `medium` and their old `sizes`.
- **Storage deletes are new**: `StorageDriver.deleteObject` (local: only under `public/uploads`, traversal refused; R2: signed DELETE, 404 ok). Before this session, deleting a photo only removed the DB row and left all files orphaned. Now `deletePhotoFiles()` (`src/lib/photos/photo-file-cleanup.ts`) removes original/large/medium/thumb from the photo's own `storageProvider`; failures are logged, not thrown.
- `npm run images:backfill:large` (`scripts/backfill-large-images.mjs`): json/prisma × local/r2, `--dry-run`, idempotent, writes back per photo. Skips photos whose `storageProvider` differs from `STORAGE_BACKEND`. Shared helpers in `scripts/lib/` (`r2-client.mjs`, `script-env.mjs`).
- `storage:migrate:r2` now carries `large` along when present.
- Fix for merged branch bug: `PhotoStage` (Server Component) passed `onContextMenu` → `/photos/[source]/[id]` returned 500. Moved into client `ContextMenuGuard`.
- OG image (`src/lib/seo/og-image.ts`) still uses `medium`; upload limits unchanged.

**Verification**:
- Unit tests: `node --import tsx --test` on all `src/**/*.test.ts` + `scripts/*.test.ts` → 88/88 (new: display helper, derivative sizing incl. real sharp output 4000×3000→2560×1920, portrait, no-enlarge; storage keys incl. large; local delete guard; backfill planning).
- Migration: applied all migrations to a temp SQLite DB; `prisma migrate diff` vs schema is empty.
- Backfill json+local on the 23 local photos: dry-run wrote nothing; real run 23 done; re-run "already had large 23". Backfill prisma+local on the temp DB: processed, wrote `largeUrl`/`largeKey`, re-run skipped; r2 row correctly skipped under local storage. (Local `data/photos.json` and generated files restored afterwards.)
- Browser (json+local dev server): 1920px viewport → hero `large&w=1920`, detail page `large&w=828` (rendered 812px), playback `large&w=1920`, album grid 3/3 `medium`; photo without large → `medium`; 375px@2x phone hero → `large&w=750`; right-click blocked on detail page.
- Local delete: original/large/medium/thumb all removed via `getPhotoStorageKeys` + `localStorageDriver.deleteObject`.
- `.session/verify.ps1 -Feature "large-image"` → ALL CHECKS PASSED (after moving stale April `.next/types/` aside — same class of issue as Session #008).

**Known issues / not verified**:
- R2 upload/delete/backfill not exercised (no test bucket). R2 DELETE needs the API token to have object delete permission (Object Read & Write).
- Real admin upload + delete through the UI not clicked (needs admin login); covered by unit tests + direct driver test.
- Local photos are only 1334px wide, so their `large` equals original size; the 2560 cap is verified by unit tests with synthetic images.
- next/image re-encodes at its default quality 75 and `priority` is deprecated in Next 16 (use `preload`); both left as-is.
- `features.json` has no entry for this feature, so it was not changed.

**Deploy (Railway) — required**:
1. `npx prisma migrate deploy`
2. `npm run images:backfill:large -- --dry-run`, then `npm run images:backfill:large`; run again to confirm everything is "already had large".

**Next**:
1. After deploy, check on a 4K/Retina screen that hero requests `…-large.webp` via `/_next/image` and that deleting a test photo removes its 4 objects in R2.
2. Consider `images.qualities` / per-image `quality` for photography (default 75) and migrating `priority` → `preload`.

---

### Session #010 - Photo Page Navigation (2026-11-05)
**Role**: Human + Agent (Coding Agent)
**Goal**: Photo page prev/next stays inside the album, keeps the "← Back" return position, and works with keyboard and swipe.
**Branch**: `feat/photo-page-navigation` (from master `3c9c6ff`)

**Album order (checked)**: the album grid and gallery playback both use `getAlbumPageData` → `listUploadedPhotos()` (createdAt desc in both repositories) filtered by `albumId`, no re-sorting in `PhotoGrid` / `AlbumGalleryMode`. That filter now lives in `filterAlbumPhotos()` (`src/lib/photos/photo-navigation.ts`) and is used by the album page *and* the photo page, so the sequences cannot drift. (Grid is CSS columns, so the visual reading order is column-wise; DOM/playback order is the list order.)

**Completed**:
- `src/lib/photos/photo-navigation.ts` (pure): `resolvePhotoNavigationScope` (returnAlbum if the photo is really in it → photo's own album → site-wide for album-less / orphaned / sample photos; malformed `%` slugs don't throw), `findPhotoNeighbors` (no wrap-around, returns index/total), `getScopedPhotoNeighbors`.
- `getPhotoNavigation(photo, returnAlbum)` in `queries.ts` replaces `getPhotoNeighbors`: one photo-list read + `listAlbums()` (album repository directly, not `getAlbums()` which lists photos again).
- `getPhotoBySourceAndId`: uploaded photos now use new `PhotoRepository.findUploadedPhotoById` (Prisma `findUnique` with album include; JSON: manifest find). Invalid ids return null without hitting the DB. Still wrapped in React `cache()`.
- URL helpers in `src/lib/gallery/album-gallery-url.ts`: `buildPhotoDetailHref(photo, {album, view})` and `buildAlbumReturnHref(slug, view, photoId)`. Used by photo page, `PhotoCard`, and `AlbumGalleryMode` (no more hand-built query strings in components).
- Photo page: prev/next carry `returnAlbum` + `returnView`, `returnPhoto` = target id; "← Back" uses the verified album slug. Added "n / total" counter; disabled arrows get `aria-disabled`. `<Link prefetch>` on prev/next.
- `PhotoPageNavigation` client component (`src/components/gallery/photo-page-navigation.tsx`) wraps the photo stage: ← / → / Esc via `router.push`, `router.prefetch` for both neighbors, swipe on the stage (≥50px and |dx| > |dy|, single finger, `touch-action: pan-y pinch-zoom`). Key filter in `src/lib/gallery/photo-page-gestures.ts` ignores input/textarea/select/contenteditable, IME composition, and modifier keys (so Alt+← browser back still works).
- `generateMetadata` canonical untouched.

**Verification**:
- Unit tests: all `src/**/*.test.ts` + `scripts/*.test.ts` → 109/109 (new: photo-navigation 11, photo-page-gestures 6, album-gallery-url +4).
- `.session/verify.ps1 -Feature "photo-nav"` → ALL CHECKS PASSED.
- Browser (`dev-json-local`, port 3004), album `album-1774242812405` (4 photos):
  - Grid card → → → → : 1/4 … 4/4, never left the album; at 4/4 Next is disabled and → does nothing.
  - Every hop kept `returnAlbum` + `returnView`, `returnPhoto` followed the current photo. Back link and Esc → `/albums/…?view=grid&photo=<last viewed>`; `returnView=gallery` → gallery overlay reopened on the last viewed photo.
  - ← / → / Esc typed in the comment textarea: no navigation.
  - 375px: 120px left swipe → next, right swipe → previous; vertical drag and 30px horizontal drag → no navigation.
  - Album-less photo: site-wide order (10 / 23), Back → `/`, canonical has no params. No console or server errors.
- **Scroll restore caveat**: the Browser pane was hidden, so `requestAnimationFrame` never fired and `window.scrollTo` had no effect there. With rAF shimmed to `setTimeout`, the album page called `scrollIntoView({block:"center"})` on `#photo-<last viewed>` after Back. Actual scroll position not seen on screen — check once on a real phone/browser.

**Known issues / not verified**:
- Prisma path (`findUnique`, album scope with real DB) not run locally (SQLite has no tables); logic shared with JSON path via pure functions.
- Stepping from an album-less photo onto an album photo (site-wide order) switches to that album's scope on the next hop — consistent with "use the photo's own album", but noted.
- Next image *file* is not preloaded, only the route (RSC payload); `<Link prefetch>` is a no-op in dev.
- `features.json` has no entry for this feature; not changed.
- Dev server rewrote `tsconfig.json` include (`.next-claude-dev/types`); reverted, not committed.

**Next**:
1. On Railway / a real phone: swipe feel, and that Back actually scrolls to the last viewed card in grid view.
2. Carry-overs from #009: `images.qualities` / `priority` → `preload`.
