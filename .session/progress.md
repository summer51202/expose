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
