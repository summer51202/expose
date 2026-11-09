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

---

### Session #011 - Home Hero Carousel (2026-11-05)
**Role**: Human + Agent (Coding Agent)
**Goal**: Hero carousel without black flashes, only photos that suit a full-bleed landscape frame, and respect for reduced motion.
**Branch**: `feat/hero-carousel` (from master `3ebf783`)

**Completed**:
- `selectHeroPhotos(photos, { limit })` in `src/lib/photos/hero-photos.ts` (pure): landscape = `width / height >= 1.2` (zero/NaN sizes rejected), newest first by `createdAt` (stable on ties), max 6. **Top-up rule (decision)**: when fewer than 2 landscape photos exist, the newest other photos are added *only until there are 2*, not up to the limit, so portraits appear only when needed. Home page passes `selectHeroPhotos(photos, { limit: 6 })` to `HeroSection`; `PhotoWallSection` still gets all photos.
- `nextHeroIndex(count, current, isSkipped)` (same file, pure): next index with wrap-around, skipping photos whose image failed.
- `HeroSection` rewrite (`src/components/home/hero-section.tsx`):
  - Two stacked layers keyed by photo: current (z-0) and incoming (z-10, opacity 0). The incoming layer mounts as soon as the current one is shown, so its image downloads in the background (`loading="eager"`, `fetchPriority="low"`).
  - Fade starts only when the display time (5 s) has passed **and** the incoming image is ready; if the image is late, the fade starts the moment it loads. After the 1 s fade (+100 ms) the incoming layer becomes current and the old one unmounts, so a fully drawn image is always on screen. Only the fade-in is animated (`transitionProperty` is `none` otherwise), so a reassigned layer never covers the current one.
  - **Readiness comes from the `<img>` itself** (native `load` listener + `complete && naturalWidth > 0`), not next/image `onLoad`: next/image can call `onLoad` for an `<img>` that is `complete` with 0 pixels and then dedupes the real load event for the same src, which stalled the carousel in testing. `error` marks the photo as failed and it is skipped.
  - First photo uses `preload` (Next 16 deprecates `priority`, per `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`) and keeps the blur placeholder.
  - Timers are one-shot `setTimeout`s, all cleared in effect cleanups. Pause when `document.visibilityState === "hidden"`, on mouse hover (`pointerType === "mouse"` only) and while focus is inside the hero. Resuming restarts the full 5 s, so returning to the tab never skips several photos.
  - **Reduced motion (decision)**: `prefers-reduced-motion: reduce` → no autoplay, first photo only, and the incoming layer is never mounted (no extra download). Server snapshot assumes reduced motion, so SSR/hydration never starts the carousel.
  - **a11y (decision)**: background layers are `aria-hidden` with `alt=""`; a caption link under the title names the current photo (title · album) and links to its photo page. It is not a live region, so screen readers are not interrupted on every change. Caption fades out/in with the photo.
  - `h-screen` → `h-svh` (Tailwind v4 emits `.h-svh { height: 100svh }`).
- `tsconfig.json`: `exclude` now has `temp-app` (nested repo from March); its `.next/types/routes.d.ts` merged into this project's global `LayoutProps` and broke `tsc` even on master.
- `eslint.config.mjs`: ignores `.next-claude-dev/**` (dist dir of `dev-json-local`); with it present, `eslint .` reported 456 errors from generated code.

**Verification**:
- Unit tests: all `src/**/*.test.ts` + `scripts/*.test.ts` → 117/117 (new: hero-photos 8).
- `.session/verify.ps1 -Feature "hero-carousel"` → ALL CHECKS PASSED.
- Browser (`dev-json-local`, port 3004; local data has 18 landscape / 5 portrait photos):
  - Server HTML / RSC payload: HeroSection `photos` has exactly 6 entries, ids `1774594710321, 1774594373023, 1774594358279, 1774594345456, 1774594339119, 1774243341789`, all ratio ≥ 1.5, matching the newest-landscape list computed from `data/photos.json`.
  - No-black check (20 ms sampling of layer opacity + `img.complete && naturalWidth > 0`): 7 transitions with cached images, 0 uncovered frames, 6.1 s cadence. With every new image's `src`/`srcset` held back 8 s (in-page patch, simulates a slow network), the incoming layer stayed at opacity 0 until loaded, then faded in; 4 transitions, 0 uncovered frames.
  - Background tab (`visibilityState` overridden + `visibilitychange`): `data-hero-paused="true"` while hidden, `false` after; no advance during 16 s hidden.
  - Reduced motion (`matchMedia` stub + client-side remount): only the current layer mounted, no `data-hero-paused` (autoplay off), no change over 7 s.
  - Focus: focusin on caption → paused, moving to the button inside → still paused, focus leaving → resumed. Real mouse hover → paused; mouse moved to the header → `:hover` false (resume confirmed once a leftover focus was cleared).
  - 375×812: "View Portfolio" at 204,726–355,772 (fully visible), caption truncates, no horizontal scroll.
  - Caption link → `/photos/uploaded/<current id>`; HeroSection unmounted, no console warnings/errors after 8 s. Accessibility tree shows the caption link and no hero images.
- **Not verified with real DevTools throttling**: the Browser pane was hidden for most of the session, and in that state it does not decode images (`naturalWidth` stays 0), so screenshots of the fade and a "Slow 4G × 3 transitions" pass were not done. The DevTools Network check (next image request well before its fade) is also only shown by the layer log (incoming mounted ≈5 s before fade).

**Known issues / not verified**:
- Please check by hand: DevTools Network → Slow 4G, watch 3 transitions; Rendering → Emulate `prefers-reduced-motion: reduce`; a real phone with a collapsing URL bar (`svh`).
- If the very first photo is slow, the page shows `bg-stone-900` + blur placeholder until it arrives (no previous image to cover it).
- Hover pause uses `pointerType === "mouse"`; synthetic `pointerover` events did not trigger it in testing, a real mouse did.
- `.next-claude-dev/` and `data/analytics-daily-*.json` are untracked dev-server output (not gitignored); left uncommitted.
- `features.json` has no entry for this feature; not changed.

**Follow-ups**:
1. Admin "featured" flag for hero photos (not done this session, as requested); `selectHeroPhotos` would prefer featured photos, then fall back to the current rule.
2. Carry-over from #009: `images.qualities` / per-image `quality` for photography.
3. Consider adding `.next-claude-dev/` to `.gitignore`.

**Next**:
1. Run the manual DevTools checks above and on a real phone after deploy.

---

### Session #012 - Railway Graceful Shutdown (2026-11-05)
**Role**: Human + Agent (Coding Agent)
**Goal**: Stop Railway's Activity feed from showing "Deployment crashed" on every redeploy.

**Diagnosis** (from `railway logs`):
- On each redeploy Railway sends SIGTERM to the old container. The start command was `npx prisma migrate deploy && npm run start`; npm logged `npm error signal SIGTERM` and exited non-zero, so Railway reported a crash (e.g. 17:25:44, old #12 container while #13 went live). The site was not down; the new container was Ready 2s later.
- Next 16 itself also exits **143** on SIGTERM (`start-server.js`: 128 + signal), so only removing npm would not be enough.
- The earlier "crashed" (~16:38) lines up with `[railway-ssh] command session ended (exit 1, 33m50s)`, the first `images:backfill:large` run that had 1 failure (the script exits 1 by design). That container never restarted.

**Completed**:
- `railway.json` (config as code, overrides the dashboard): `npx prisma migrate deploy && exec node scripts/start.mjs`. Migrations stay in the start command, because the volume is only mounted at runtime.
- `scripts/start.mjs`: spawns `next start`, forwards SIGTERM/SIGINT, exits 0 when the shutdown was requested; unrequested exits keep their code. `resolveExitCode` is unit-tested (`scripts/start.test.ts`).
- `docs/runbooks/railway-runbook.md` start-command section updated.

**Verification**:
- `node --import tsx --test scripts/start.test.ts` → 3/3.
- `.session/verify.ps1 -Feature "railway-graceful-shutdown"` → ALL CHECKS PASSED.
- Smoke test: `node scripts/start.mjs` with the verify build on port 3011 → home and photo page 200.

**Not verified**:
- The real SIGTERM path. Windows cannot deliver a graceful SIGTERM to a child process, so this is only checkable on Railway: after the next redeploy, the old container's log should end with `[start] next stopped after shutdown request (code 143); exiting 0` and Activity should not show "Deployment crashed".

**Next**:
1. Merge, then watch the following redeploy in Railway Activity.
2. If Railway still flags it, check that `railway.json` was picked up (Service → Settings → Deploy shows "managed by railway.json").

---

### Session #013 - About / Contact page and site footer (2026-11-05)
**Role**: Human + Agent (Coding Agent)
**Goal**: Add an About page with a contact section, an About link in the header, and a footer on every public page.
**Branch**: `feat/about-contact` (from master `0f008a0`)
**Session number**: The brief called this #012, but PR #14 (Railway shutdown) already used #012 in this log, so this is #013.

**Completed**:
- `src/config/site.ts`: new `about` (heading, `bio[]` paragraphs, `portrait` = `{kind:"photo", photoId}` | `{kind:"static", src, width, height}` | `null`, `services[]`, `featuredPhotoIds[]`) and `contact` (`email`, `intro`, `social[]` Instagram/Facebook/Threads), plus `aboutPath` / `contactPath`.
- `src/lib/about/about-content.ts` (pure, 6 tests): `getVisibleSocialLinks` (only non-empty http(s) URLs; `javascript:` is dropped), `isUsableEmail`, `buildMailtoHref`, `selectFeaturedPhotos` (configured ids in order, else the newest 6), `buildPersonJsonLd`, `serializeJsonLd` (escapes `<` as the Next.js JSON-LD guide recommends, plus U+2028/2029).
- `/about` (`src/app/(browse)/about/page.tsx`, Server Component, `force-dynamic`): eyebrow + name + bio, optional portrait, optional services, up to 6 featured photo thumbnails linking to `/photos/uploaded/<id>` (uploaded photos only, with the right-click guard), and a `#contact` Panel (`scroll-mt-24` under the fixed header) with a `mailto:` link and labelled social links. When there is no email and no social link it says "Contact details coming soon."
- SEO: static `metadata` (title "About", description = first non-TODO bio paragraph or a generated line, canonical `/about`, `openGraph` = `baseOpenGraph` + `type: "profile"`, twitter). Its own `about/opengraph-image.ts` (portrait if set, else the newest upload), because a page-level `openGraph` drops the image inherited from the root. JSON-LD `Person` (name, url, description, image only when a portrait is set, email, sameAs). `/about` added to `sitemap.ts`.
- CSP: `script-src` already includes `'unsafe-inline'`, and `application/ld+json` is not executed anyway, so no CSP change was needed.
- `SiteHeader`: nav is a `NAV_LINKS` array (Albums, About) with `whitespace-nowrap` and `gap-5 sm:gap-6`.
- `SiteFooter` (`src/components/layout/site-footer.tsx`, Server Component, light/dark): `© {year} {photographerName}. All rights reserved.`, About and Contact links, social icons (icon only, `aria-label`). The year is computed at server render. Used in `(browse)/layout.tsx` (light) and `photos/[source]/[id]/layout.tsx` (dark). Admin has no footer.
- `SocialLinks` (`social-links.tsx`): inline SVG icons, `target="_blank" rel="noopener noreferrer"`, returns `null` when no link is visible.
- `.gitignore`: `/.next-claude-dev/`, `/data/analytics-daily-*.json`.
- Bug fixed during testing: `<Link href="#contact">` on `/about#contact` produced `#contact#contact`. The in-page "Get in touch" button is now a plain `<a>`.

**Verification**:
- Unit tests: all `src/**/*.test.ts` + `scripts/*.test.ts` → 126/126 (new: about-content 6).
- `.session/verify.ps1 -Feature "about-contact"` → ALL CHECKS PASSED.
- Browser / curl on a json+local dev server, **port 3005** (`dev-json-local` on 3004 was held by another chat; a temporary launch config was added and removed afterwards):
  - `/about` head: title `About · Expose`, description, canonical `/about`, og:title / description / url / site_name / type=profile, og:image + twitter:image → `/about/opengraph-image-…` 200 image/jpeg 1200×630.
  - With test values filled in temporarily (portrait photo id, services, email, Instagram only; all reverted): contact block has `mailto:hello@example.test` and Instagram (`_blank`, `noopener noreferrer`); Facebook/Threads (empty) not rendered in the contact block or the footer; footer has About, Contact and the Instagram icon. With the real placeholder config there are no social `<a>` tags at all.
  - JSON-LD pasted into validator.schema.org (code snippet): one Person, 0 errors, 0 warnings.
  - Console on `/about`, the home page and a photo page: no CSP violations, no hydration warnings. The CSP header is present on `/about`.
  - Header About link + footer: `/`, `/albums/<slug>`, `/photos/uploaded/<id>` (dark footer classes) and `/about` all 200 with both; `/admin/login` has neither.
  - 375×812: header links Expose / Albums / About on one row (top 18px, About ends at x=355), no horizontal scroll.
  - `/sitemap.xml` has `<loc>…/about</loc>`.
- **Not verified**: the actual scroll position for `/about#contact`. The session's window was not open, so the Browser pane stayed hidden and `window.scrollTo` had no effect there (same as #010). `#contact` exists and has `scroll-margin-top: 96px`. Check by hand.

**Content update (same PR)**: the user filled in the bio and contact intro (Chinese). Email `summer51202@gmail.com`; Instagram `https://www.instagram.com/summer51202/` (the `?cplk=` share-tracking param was dropped); Facebook `https://www.facebook.com/li.guang.ting.265568` (the `/share/1CWkym3Mk4/` link 302-redirects there; the `rdid` param was dropped); Threads `https://www.threads.com/@summer51202`. Checked on the dev server: the contact block and footer show all of them with `_blank` + `noopener noreferrer`, JSON-LD `sameAs` lists all three, the meta description is the first bio line, and the console has no errors.

**Known issues / not done**:
- Still empty: `portrait: null` (so JSON-LD has no `image`), `services: []`, `featuredPhotoIds: []` (falls back to the newest 6 uploads).
- `<html lang="en">` while the About text is now Chinese; decide on the site language later (carry-over from #008).
- JSON-LD `image` is only set when a portrait is configured (a person's image should be the person, not a random photo).
- The header link on the transparent hero uses the same colours as the existing Albums link (`text-stone-700`). A dark hero photo can make both hard to read; this was not changed.
- Rich Results Test (Google) was not run; Person is not a rich-result type, so the schema.org validator was used.
- `features.json` has no entry for this feature; it was not changed.

**Next**:
1. Optionally set a portrait and featured ids, then check `/about#contact` scrolling on a real browser and phone.
2. After deploy: share `/about` in LINE / Facebook Debugger to check the preview.
3. Carry-overs: `images.qualities`, admin "featured" flag for the hero.

---

### Session #014 - Admin "featured" photos (2026-11-06)
**Role**: Agent (Coding Agent, started from another session)
**Goal**: Let the owner mark photos as featured in the admin, instead of editing `featuredPhotoIds` in `src/config/site.ts` and redeploying. Featured photos drive `/about` "Selected work" and the home hero (Session #011 follow-up 1).
**Branch**: `feat/featured-photos` (from master `8c6af5d`)

**Completed**:
- Data: `Photo.featured Boolean @default(false)` + `Photo.featuredAt DateTime?` (migration `20261106000000_photo_featured`, two `ALTER TABLE ... ADD COLUMN`, safe on existing rows). `GalleryPhoto` (so also `PhotoRecord` / `PublicPhoto`) has optional `featured` / `featuredAt`; `toPublicPhoto` copies them (`featured` is always a boolean there). JSON photos without the field count as not featured; no data migration needed.
- `src/lib/photos/featured-photos.ts` (pure, 4 tests): `isFeaturedPhoto`, `applyFeatured(photo, featured, now)` (marking an already featured photo keeps its `featuredAt`; unmarking removes it), `sortFeaturedPhotos` (featured only, most recently featured first, undated last, stable).
- Repository: `setPhotoFeatured(photoId, featured)` on both backends, returns the updated record or `null`. Prisma: `updateMany where {id, featured:false}` when marking (so a repeat submit does not re-stamp `featuredAt`), `featuredAt: null` when unmarking; `mapPhotoCreateInput` writes the flag. JSON: `applyFeatured` + `replaceManifestPhotos` (rewrites the manifest newest-first, the same as moving a photo).
- Admin: `setPhotoFeaturedAction(photoId, prev, formData)` in `src/app/admin/photo-actions.ts`: `requireAdminSession()`, validates the id and a hidden `featured=true|false` field, revalidates `/`, `/about`, `/admin/photos`. `PhotoManager` rows have a "☆ 設為精選" / "★ 取消精選" button (`aria-pressed`), a "★ 精選" badge next to the title, and the album filter has a "精選（n）" option. Errors are shown; success is shown by the badge (no extra message).
- `/about` Selected work: `selectFeaturedPhotos(photos, limit = 6)` = featured photos (any orientation), most recently featured first; when none are marked, the newest 6 uploads (as before).
- **Decision: `siteConfig.about.featuredPhotoIds` removed** (type + value). It was empty in production, and two sources of truth would make "why is this photo here?" hard to answer. A comment in `site.ts` points to `/admin/photos`.
- Home hero `selectHeroPhotos` (decision): when there are **at least 2 featured landscape photos** (ratio >= 1.2), the hero shows only those (most recently featured first, max 6). Otherwise the old rule runs, with any featured landscape photo moved to the front, then newest landscape, then the "top up to 2" rule. Featured portraits never get into the featured-only hero. Also replaced `b - a` sort comparators with explicit compares (an invalid date gave `-Infinity - -Infinity = NaN`).
- `/admin/photos` intro text explains what featured does.

**Verification**:
- Unit tests: all `src/**/*.test.ts` + `scripts/*.test.ts` → 135/135 (new: featured-photos 4, hero +4, about-content featured 3 replacing 2).
- Prisma path on a throwaway SQLite DB (`prisma migrate deploy` applied all 6 migrations, then the real repository via tsx): new photo `featured=false`; mark → `true` + timestamp; mark again → same timestamp; unmark → `false`, no `featuredAt`; unknown id → `null`.
- Browser + curl on `dev-json-local` (port 3004, worktree with a temporary `.env.local` holding test admin credentials, a junction to the main checkout's `public/uploads`, and `.claude/launch.json`; all removed afterwards, `data/photos.json` restored with git):
  - Marked `1774002399125` (landscape), `1774242896163` (landscape), `1774594342586` (portrait) from `/admin/photos`: badge + `aria-pressed=true` after each click, filter shows "精選（n）", `data/photos.json` got `featured` + `featuredAt`. `/about` → `[…342586, …896163, …399125]` (newest featured first). Hero props → `[…896163, …399125]` only.
  - Only `1774002399125` featured: hero → `[…399125, 1774594710321, …373023, …358279, …345456, …339119]`, `/about` → `[…399125]`.
  - None featured: hero = the Session #011 list exactly, `/about` = the original newest 6. Unmarking removed `featuredAt` from the JSON.
  - The dev server crashed once (Windows exit 0xC0000409, after 5 min, while the hidden Browser pane had a stuck request). The action calls took 14–357 ms; it restarted cleanly. Not investigated further.
- `.session/verify.ps1 -Feature "featured-photos"` → ALL CHECKS PASSED (lint, tsc, build).
- **Not verified**: how the admin page looks (the Browser pane was hidden all session, so there are no screenshots); the Prisma backend through the UI (only through the repository script).

**Deploy**: Railway's start command already runs `npx prisma migrate deploy`, which applies the new migration on the next deploy. Existing photos start as not featured, so the site looks the same until the owner marks photos.

**Known issues / not done**:
- `scripts/migrate-json-to-prisma.mjs` does not copy `featured` / `featuredAt` (it also never copied `largeUrl`); only matters if the JSON → Prisma import is run again.
- The section heading ("Selected work" / "A few favourites") is still hard-coded in the About page.
- No manual ordering of featured photos beyond "most recently featured first" (unmark + mark again moves a photo to the front).
- `features.json` has no entry for this feature; not changed.

**Next**:
1. After deploy, mark 2–6 landscape photos in `/admin/photos` and check the hero and `/about` on production.
2. Look at the admin row layout on a real screen (button row now has 移動 / 精選 / 刪除).
3. Carry-overs: `images.qualities`, site language (`<html lang>`), portrait / services for `/about`.

---

### Session #015 - Railway config as code → infrastructure as code (2026-11-06)
**Role**: Agent (Coding Agent), asked by the user after Session #014's deploy warned that `railway.json` is deprecated (works until 2026-12-01).
**Branch**: `chore/railway-config-as-code` (from master `373da8e`)

**Findings (important)**:
- Railway does **not** read `.railway/railway.ts` during deploys. The file only changes Railway when `railway config apply` runs (or a GitHub Action does it on merge).
- The file `railway config migrate --service expose` generates only has the start command, with `export const partial = "expose"`. Its `railway config plan` showed **14 destructive changes**: delete all 13 service variables (AUTH_SECRET, ADMIN_*, DATABASE_URL, R2_*, ...), drop the GitHub source (`summer51202/expose`, branch master) and detach the `/data` volume (the SQLite DB). **Do not apply a file made by `migrate` alone.**
- `railway config pull` imports the whole service: GitHub source, volume (`expose-volume`, 500 MB, us-east4), replicas, `/data` mount, and every variable as `preserve()` (no secret values in the file). With the start command edited, the plan is `0 to add, 1 to change, 0 to destroy`: only `deploy.startCommand` "npx prisma migrate deploy && npm run start" → "npx prisma migrate deploy && exec node scripts/start.mjs". (The dashboard still had the pre-#012 command; `railway.json` was overriding it.)
- Windows quirk: the `railway` npm SDK checks the CLI version by running `$_ --version` (falls back to `railway`). In Git Bash `$_` is npm's sh shim, so it fails with "requires Railway CLI 5.42.1 or newer" even on 5.45.6. Fix: set `_` to `%APPDATA%\npm\node_modules\@railway\cli\bin\railway.exe`.

**Completed (repo)**:
- `.railway/railway.ts` (pulled, start command updated) and `.railway/README.md` (generated by the CLI).
- `railway@3.16.0` (Railway's official TS SDK, imported by the file) added as a devDependency; the production install omits dev deps.
- `railway.json` deleted; `scripts/start.mjs` comment and `docs/runbooks/railway-runbook.md` section 4 updated (plan before apply, what a bad plan looks like, the Windows `_` fix, pull after dashboard edits).
- Local folder linked with `railway link` (project expose / production / service expose).

**Applied to production (same session, user asked)**:
- `railway config migrate --service expose --apply --force` → "Cleared Railway Config File on the linked service" (it also overwrote `.railway/railway.ts` with the start-command-only file; restored with `git checkout`).
- `railway config plan --out <file>` (0 add / 1 change / 0 destroy) → `railway config apply --plan <file> --yes` → "Applied pinned Railway configuration." A new plan then says "already up to date". All 13 variables are still there.
- The apply triggered a redeploy (b31ed09d, SUCCESS: "No pending migrations to apply", Next ready). The old container's log ends with `[start] next stopped after shutdown request (code 143); exiting 0` (Session #012 fix confirmed on Railway).
- PR #17 merged (`53c95f0`); deploy afbdccdd SUCCESS, `/` and `/about` 200.
- The "Config as Code is deprecated" line still shows in local `railway logs` output: it is the local CLI (stderr) finding `D:Projectexposeailway.json` in the main checkout, which is on an older master. It goes away after `git pull` there.

**Verification**:
- `railway config plan` with the final file → 1 change, 0 destroy (see above).
- `.session/verify.ps1 -Feature "railway-iac"` → ALL CHECKS PASSED (lint, tsc incl. .railway/railway.ts, build).

**Next**:
1. Future start-command / service changes: edit `.railway/railway.ts`, `railway config plan`, then `railway config apply` (see runbook section 4).
2. Optional: GitHub Action `railwayapp/config` to apply pinned plans on merge.

---

### Session #016 - Security dependency upgrade: next, sharp, transitive deps (2026-11-06)
**Role**: Agent (Coding Agent). Not a `features.json` feature; `features.json` not changed.
**Branch**: `chore/security-deps-upgrade` (from master `daed0a9`)

**npm audit --omit=dev**:
- Before: 6 (1 critical, 4 high, 1 moderate): next 16.2.0 (critical, Server Components DoS + RCE in `use cache` + proxy bypass), sharp 0.34.5 (high, libvips / libheif / librsvg CVEs), postcss (high, nested in next), nanoid (high), source-map-js (high), baseline-browser-mapping (moderate).
- After: **0 vulnerabilities**.
- Full `npm audit` (incl. dev) still shows 8 moderate + 1 low, all dev-only: esbuild (via tsx) and minimatch (via typescript-eslint inside eslint-config-next; the only fix is `--force`). Not shipped to production; left for a later bump.

**Completed**:
- `next` 16.2.0 → 16.4.5 (exact pin kept), `eslint-config-next` 16.2.0 → 16.4.5, `sharp` ^0.34.5 → ^0.35.5 (next 16.4.5 also depends on sharp 0.35.5, now deduped). `npm audit fix` (no `--force`) for nanoid 3.3.20, source-map-js 1.2.2, baseline-browser-mapping 2.11.35, postcss 8.5.23.
- Next 16.2 → 16.4: diffed the bundled docs of 16.2.0 (from `npm pack`) against 16.4.5. Nothing in metadata, opengraph-image, sitemap/robots, `images`, `headers()` or `serverActions.bodySizeLimit` affects this app. Notes: `headers` in next.config may now be sync (ours stays async, fine); `serverActions.allowedOrigins` docs now spell out that the Origin check uses `x-forwarded-host` (Railway forwards it; uploads worked before and nothing changed); opengraph-image docs now say the default export should return a `Response` (ours already do).
- sharp 0.35 breaking changes (Node >= 20.9.0, no install script, `limitInputChannels` default 5, removed `failOnError` / `paletteBitDepth` / old `sharpen` props, `format.jp2k` → `jp2`): none of the removed APIs are used. **One real break**: the ESM types no longer have the `sharp.Sharp` / `sharp.Metadata` namespace, so `next build` failed type check in `image-pipeline.ts`. Fixed with `import sharp, { type Metadata, type Sharp } from "sharp"`.
- Railway: Railpack 0.43 builds on **Node 22.23.4** ("previous installed version (22)"; no `engines` / `.nvmrc`), which meets sharp's >= 20.9.0. The lockfile has `@img/sharp-linux-x64@0.35.5` + `@img/sharp-libvips-linux-x64`. No `engines` field added (it could make Railpack pick a different Node).
- **Bug fix found while testing (same on 0.34.5 and 0.35.5)**: `sharp(buf).rotate().metadata()` returns the *input* size, so photos with an EXIF orientation tag (most phone portraits) were stored with width/height swapped, even though the files were rotated correctly. Now uses `metadata.autoOrient`. New test in `image-derivatives.test.ts`. Existing photos keep their stored size (no backfill done).
- eslint-config-next 16.4.5 brings eslint-plugin-react-hooks 7.0.1 → 7.1.1, whose `set-state-in-effect` rule failed lint in `album-photo-experience.tsx` (sync `mode` from `?view=`) and `album-gallery-mode.tsx` (reset index on `photos` / `initialPhotoId` change). Both moved to React's "adjust state while rendering" pattern (same behavior, one less render).
- `eslint.config.mjs` ignores `.claude/worktrees/**` (local agent worktrees; 6345 lint problems came from there, the same reason `.worktrees/**` is ignored).

**Verification**:
- `.session/verify.ps1 -Feature "security-deps"` → ALL CHECKS PASSED (lint, tsc, build). Lint has 2 old warnings (unused `_prevState` / `_prev`).
- `node --import tsx --test` on all `src/**/*.test.ts` + `scripts/*.test.ts` → 136/136.
- `dev-json-local` (port 3004), temporary `.env.local` with generated test admin credentials (deleted afterwards). Uploaded a generated JPEG: 3000×2000 pixels stored sideways with EXIF orientation 6 (displays as a 2000×3000 portrait with a red "TOP" band) and Fujifilm X-T5 / XF35mm / 1/250 / f2.8 / ISO 400 EXIF:
  - record width/height 2000×3000; original 2000×3000, large 1707×2560, medium 800×1200, thumb 267×400, all WebP, red band at the top in every file.
  - `exifData` has make, model, lens, focal length, aperture, exposure, ISO, takenAt; the photo page shows them.
  - `/photos/uploaded/<id>/opengraph-image` → 200 `image/jpeg` 1200×630, correct orientation (attention crop kept the text).
  - `/`, album page, `?view=gallery&photo=`, photo page, `/about`, `/sitemap.xml` (28 urls), `/robots.txt` → 200. All four og:image URLs from page meta → 200 JPEG (route-group ones have a hash suffix, e.g. `/about/opengraph-image-3027i9`, which is normal).
  - Album view: Gallery View → grid, next/prev (counter + `?photo=` follow), Grid View, and client `router.push` of `?view=` / `?photo=` all update the view. No console errors, no server errors.
  - `curl -I /`: Content-Security-Policy, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy present.
  - Test upload files deleted, `data/photos.json` restored with git.
- Build warning (not an error): Turbopack "Dynamic filesystem access causes tracing of the whole project" for `path.join(process.cwd(), "public")` in `src/lib/seo/og-image.ts`. Not checked whether 16.2 printed it too.

**Known issues / not done**:
- Existing EXIF-rotated photos in production may still have swapped width/height (fix only covers new uploads). A backfill script could re-read `original` sizes.
- Dev-only moderate advisories (esbuild, minimatch) remain.
- The og-image tracing warning above (could add `/*turbopackIgnore: true*/` or scope the path).

**Next**:
1. After merge, Railway rebuilds: check Deploy / Build Logs for sharp install errors (e.g. missing linux-x64 binary), then upload one test photo (ideally a phone portrait) and check it on production, including its `opengraph-image`.
2. Optional: backfill width/height for existing EXIF-rotated photos.
3. Optional: bump tsx / typescript-eslint when fixes land for the dev-only advisories.

---

### Session #017 - 照片原圖移到私有 R2 bucket (2026-11-09)
**Role**: Agent (Coding Agent)。不是 `features.json` 裡的 feature，`features.json` 沒有改。
**Branch**: `feat/private-originals`（從 master `0fe8140`）

**背景**：原圖 `uploads/<name>-original.webp`（WebP q92，已清 EXIF/GPS）和 large/medium/thumb 放在同一個公開 bucket `expose`。頁面上的 large 網址把 `-large` 換成 `-original` 就能下載全解析度原圖。使用者已在 Cloudflare 建好私有 bucket `expose-private`（沒開 public access 和 r2.dev），並讓現有 R2 token 對兩個 bucket 都有 Object Read & Write。

**設計**：
- 原圖寫到 `R2_PRIVATE_BUCKET_NAME`，用同一組 R2 憑證和 endpoint，key 不變（`uploads/<name>-original.webp`）。local（`STORAGE_BACKEND=local`）寫到 `storage/private/uploads/`，這個資料夾不在 `public/` 底下，已加進 .gitignore。
- DB 的 `originalUrl` 欄位是必填（Prisma `String`），改存內部標記 `private:<key>`，`originalKey` 存 key。不改 schema，也不需要 migration。`originalUrl` 不是 `private:` 開頭的就是舊資料，原圖還在公開 storage。
- `src/lib/storage/private-original.ts`：`toPrivateOriginalUrl` / `isPrivateOriginalUrl` / `privateKeyFromOriginalUrl`。`scripts/lib/private-originals.mjs` 是給 scripts 用的同一套邏輯，有測試確認兩邊的 prefix 一致。
- `PrivateStorageDriver`（put/get/delete，沒有 URL）：`r2PrivateStorageDriver`、`localPrivateStorageDriver`。`provider.ts` 加了 `getPrivateStorageDriver(For)`、`assertPrivateStorageReady`，以及 server-only 的 `readPrivateOriginal(key)`。
- `STORAGE_BACKEND=r2` 沒設 `R2_PRIVATE_BUCKET_NAME`，或設成和 `R2_BUCKET_NAME` 一樣時，上傳會在寫入任何檔案之前丟 `PrivateStorageConfigError`。後台看到的訊息是「伺服器尚未設定私有儲存空間（R2_PRIVATE_BUCKET_NAME）…」。
- 刪除：`getPhotoStorageObjects` 回傳 `{ key, visibility }`。私有原圖從私有 storage 刪，舊資料的原圖照舊從公開 storage 刪。
- `backfill-large-images.mjs`：私有原圖從私有 storage 讀，舊資料從公開 storage 讀。R2 改用簽章的 GET，不再 fetch 公開網址。
- `migrate-local-uploads-to-r2.mjs`（舊的一次性腳本）：原圖一律傳到私有 bucket。
- 刪掉沒有被使用的 `src/lib/uploads/upload-service.ts`（grep 確認沒有任何 import）。

**一次性搬移腳本** `scripts/migrate-originals-private.mjs`（`npm run originals:migrate:private`）：
- 預設是 dry-run，列出每張要搬的原圖和大小。加 `--apply` 才會實際執行。
- 每張照片依序做：複製到私有 storage → 讀回來比對大小和 sha256 → 更新 DB → 刪掉公開 storage 的原圖。
- 可以重跑：已經是 `private:` 的照片會跳過。如果上次在「更新 DB 之後、刪除之前」中斷，留下的公開檔會在確認私有那份存在之後刪掉（計入 cleaned）。如果公開檔已經不見、但私有那份存在，就直接補寫 DB。
- 結束時印出 `Migrated / cleaned / skipped / failed`，有失敗時 exit code 是 1。
- prisma 模式下，如果 `DATABASE_URL` 是 `file:` 但檔案不存在（例如在自己電腦上用 `railway run`）會直接拒絕執行。Railway 上要用 `railway ssh --service expose -- npm run originals:migrate:private`。

**驗證**：
- `.session/verify.ps1 -Feature "private-originals"` → ALL CHECKS PASSED（lint、tsc、build）。Build 只剩 `og-image.ts` 原本就有的 2 個 tracing warning；新的 local private driver 已加 `turbopackIgnore`。
- `node --import tsx --test` 全部 157/157 通過。新增的測試涵蓋：key/URL 轉換、私有 bucket 沒設或和公開 bucket 同名時會報錯、搬移的計畫邏輯（搬移、已私有、其他 backend、樣本照片、無法解析、originalKey 其實是 URL）、刪除時區分 public/private、backfill 讀私有原圖、local 私有路徑防 traversal。
- `dev-json-local`（port 3004），用暫時的 `.env.local` 放產生的測試管理員帳密（測完已刪除）：
  - 上傳一張 3000×2000 的 JPEG：原圖只出現在 `storage/private/uploads/`，`public/uploads/` 只有 large/medium/thumb。紀錄的 `originalUrl` 是 `private:uploads/...-original.webp`。
  - `/`、相簿頁、`?view=gallery&photo=`、照片頁、`/about`、`/sitemap.xml`、`/robots.txt` 都是 200，HTML 和 header 都沒有 `-original`。照片的 OG image 是 200 JPEG 1200×630。`/uploads/...-original.webp` 和 `/storage/private/...` 都回 404。console 和 server 都沒有錯誤。
  - 移除這張的 large 後跑 `images:backfill:large`：從私有資料夾讀原圖，重新產生 2560×1707。另外 23 張舊資料從 public 讀，也都正常。
  - 在後台刪除這張照片：私有原圖和三個公開衍生圖都刪掉了。
  - 搬移腳本（本機舊資料 23 張）：dry-run 不改任何檔案。`--apply` 之前先模擬兩種中斷（只複製未更新 DB、公開檔已不見），結果 23 張全部搬完，私有檔和備份逐 byte 一致。之後把一張原圖放回 public，dry-run 顯示 `would clean 1`，`--apply` 刪掉它；再跑一次是 `Migrated 0, cleaned 0, skipped 23, failed 0`。搬移後各頁正常，舊的 `-original` 網址回 404。
  - 測試完還原了 `data/photos.json`（git）和 `public/uploads/`（從備份），刪掉 `storage/`、`.env.local`、`.next-claude-dev`，tsconfig 自動加的路徑也已還原。
- 沒有實際測：R2 模式（本機沒有 R2 憑證）。`STORAGE_BACKEND=r2` 沒設私有 bucket 時的報錯只有單元測試（`resolvePrivateBucketName`），沒有實際跑過上傳。

**使用者要做的事（依序）**：
1. Railway 設定 `R2_PRIVATE_BUCKET_NAME=expose-private`（合併前）。
2. 合併 PR，等部署成功。
3. 上傳一張測試照片，到 Cloudflare 確認原圖出現在 `expose-private`，`expose` 裡沒有這張的原圖。
4. `railway ssh --service expose -- npm run originals:migrate:private`（dry-run），確認清單後再加 `-- --apply`。
5. 拿一張舊照片的 large 網址，把 `-large` 改成 `-original`，應該回 404。

**遺留問題**：
- R2 公開 URL 可能有 CDN／瀏覽器快取（原圖的 Cache-Control 是 `immutable`、一年）。r2.dev 刪除後通常很快就回 404，但如果之後換成 custom domain + Cloudflare cache，可能需要 purge。
- `railway ssh` 如果因為網路擋 port 而連不上，要換網路再試（runbook 有寫指令）。
- 之後要用原圖重做浮水印或降低對外尺寸時，用 `readPrivateOriginal(key)`（server）或 scripts 的 `getR2Object(config, { key, bucket: getR2PrivateBucketName() })`。

**下一步**：
1. 照上面 1–5 的順序上線並搬移。
2. 用私有原圖重做浮水印、降低對外的 large 尺寸。

**正式站上線結果（2026-11-09，同一個 session）**：
- 使用者在 Railway 設好 `R2_PRIVATE_BUCKET_NAME=expose-private`。第一次查的時候還讀不到，因為變數改動停在 staged 狀態，按下 Deploy 後才生效。
- PR #22 合併，部署 4c667a55 SUCCESS。
- 用內建瀏覽器（使用者自己登入）上傳一張測試照片 `zz-prod-check-delete-me` 到「2025滑雪的東京」：
  - DB 的 `originalUrl` 是 `private:uploads/...-original.webp`。
  - 公開 r2.dev 上的 `-original` 回 404，large/medium/thumb 回 200。
  - 使用者在 Cloudflare 確認原圖出現在 `expose-private`。
  - 相簿頁、gallery、照片頁都是 200，沒有 `-original`。OG image 200 JPEG。
- 在後台刪除這張照片：公開檔都回 404，照片頁 404。使用者確認 `expose-private` 裡的原圖也消失了。
- 使用者用 `railway ssh --service expose -- npm run originals:migrate:private`（先 dry-run，再 `-- --apply`）搬移：`Migrated 991, cleaned 0 leftover public copies, skipped 0, failed 0. (of 991 photos)`。
- 抽查首頁、`/about`、相簿 `2025-6` 的 79 張舊照片：large 全部 200，把 `-large` 換成 `-original` 全部 404。
- 注意：Claude Code 自動模式不允許 agent 用 `railway ssh` 在正式容器裡執行指令（包括只讀的檢查），所以 bucket 內容由使用者在 Cloudflare 確認，搬移腳本也由使用者執行。

**下一步**：用 `expose-private` 的原圖重做浮水印、降低對外的 large 尺寸。備份時要包含 `expose-private`（它是唯一的全解析度副本）。

---

## Session #018-A（2026-11-09）— 浮水印、large 2048px、版權 EXIF、重新產生腳本（進行中，未完成）

**分支／worktree**：`feat/watermark-derivatives`，`.worktrees/watermark`（尚未 push、尚未開 PR）。

**已完成（已 commit）**：
- `src/lib/uploads/derivative-render.mjs`：上傳和 scripts 共用的渲染邏輯。`LARGE_MAX_DIMENSION=2048`、`DERIVATIVE_VERSION=2`、`WATERMARK` 設定物件（開關、文字 `© {name}`、透明度、字級／邊距依短邊比例、陰影、字型）、`COPYRIGHT_METADATA`。
- 字型自帶 `src/lib/uploads/fonts/Geist-Regular.ttf`（OFL，取自 next 內附），因為 Railway 容器沒有系統字型。
- EXIF 用 sharp 0.35 `withExif({ IFD0: { Artist, Copyright } })`；讀回驗證沒有 Make/Model/GPS。注意：libvips 把 `©` 寫成 `(C)`，並自動加 Orientation/解析度/像素尺寸等結構欄位。
- 新上傳寫入 `-large.v2.webp` 等版本化 key。DB 的 width/height 是原圖（轉正後）尺寸，不是衍生圖尺寸。
- `scripts/regenerate-derivatives.mjs`（`npm run images:regenerate`）：預設 dry-run，`--apply`、`--limit N`、`--only <id>`；新 key → 更新 DB → 刪舊檔，可重跑（清除遺留舊檔）。
- 移除 `backfill-large-images.mjs`（會產生沒浮水印的 large，功能已被取代）。
- 單元測試：全部 167 個通過；tsc、eslint 通過（只有既有的 2 個 warning）。
- runbook 新增「Public Derivatives」章節。

**尚未完成（下一個 session 接手）**：
1. `.session/verify.ps1 -Feature "watermark-derivatives"`（含 build）。
2. port 3011 實測（`NEXT_DIST_DIR=.next-wt-a`）：上傳橫式＋直式、確認 large 2048、EXIF、首頁／相簿／照片頁／`/opengraph-image`。需要測試管理員帳密：用暫時 `.env.local`，測完刪除。
3. 用本機舊資料跑 `images:regenerate` dry-run 和 `--apply`（本機 23 張舊照片的原圖在 public/uploads，屬 legacy）；測完還原 `data/photos.json` 和 `public/uploads/`。
4. 浮水印截圖給使用者確認，push（HTTPS）、開 PR（中文說明，附截圖與合併後步驟）。
5. 若 tsconfig 被自動加入 `.next-*` 路徑，commit 前還原。
