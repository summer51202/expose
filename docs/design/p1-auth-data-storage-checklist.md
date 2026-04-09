# P1-AUTH / P1-DATA / P1-STORAGE 實作 Checklist

## 使用方式

這份清單是照實作順序排的，不是照 feature id 排的。

完成原則：

- 每完成一個區塊就跑一次 lint / tsc。
- 每完成一個 milestone 就做一次手動 smoke test。
- 切換 `DATA_BACKEND` 或 `STORAGE_BACKEND` 前，先確保上一階段可回退。

---

## Milestone 0: Preflight

- [ ] 確認 `.env` 已具備 `DATABASE_URL`、`AUTH_SECRET`、admin credentials、R2 變數
- [ ] 決定是否新增 `DATA_BACKEND`
- [ ] 決定是否新增 `STORAGE_BACKEND`
- [ ] 確認 Prisma schema 需要補哪些欄位
- [ ] 確認 uploaded 與 sample 的責任邊界

---

## Milestone 1: P1-AUTH

### Auth config

- [ ] 新增集中式 `getAuthConfig()`
- [ ] production 下禁止弱 `AUTH_SECRET`
- [ ] production 下禁止 `ADMIN_PASSWORD=change-me`
- [ ] dev 下若使用預設值，提供 warning

### Login / session

- [ ] 帳密比對改為 timing-safe compare
- [ ] login action 維持 generic error message
- [ ] session payload 加入 `role: "admin"`
- [ ] cookie options 明確保留 `httpOnly` / `sameSite=lax` / `secure in prod`

### Authorization boundary

- [ ] `src/app/admin/page.tsx` 使用 `requireAdminSession()`
- [ ] `src/app/admin/upload-actions.ts` 使用 `requireAdminSession()`
- [ ] `src/app/admin/album-actions.ts` 使用 `requireAdminSession()`
- [ ] `src/app/admin/engagement-actions.ts` 使用 `requireAdminSession()`
- [ ] 若新增 admin route handler，也做同樣檢查

### Smoke test

- [ ] 未登入訪問 `/admin` 會轉到 `/admin/login`
- [ ] 錯誤帳密無法登入
- [ ] 正確帳密可登入
- [ ] 登出後 cookie 清除

---

## Milestone 2: Repository abstraction

### Domain contracts

- [ ] `albums/repository.ts`
- [ ] `photos/repository.ts`
- [ ] `comments/repository.ts`
- [ ] `likes/repository.ts`

### Provider

- [ ] `src/lib/data/provider.ts` 根據 `DATA_BACKEND` 回傳對應 repo
- [ ] 先接 manifest adapter
- [ ] `queries.ts` 改成只依賴 provider

### Refactor read path

- [ ] `getAlbums()`
- [ ] `getAlbumBySlug()`
- [ ] `getAlbumOptions()`
- [ ] `getGalleryPhotos()`
- [ ] `getRecentUploads()`
- [ ] `getPhotoBySourceAndId()`
- [ ] `getPhotoNeighbors()`
- [ ] `getPhotosByAlbumSlug()`
- [ ] `getCommentsByPhoto()`
- [ ] `getAdminComments()`
- [ ] `getLikeSummaryByPhoto()`
- [ ] `getAdminLikeSummaries()`

### Refactor write path

- [ ] album actions 改走 repository
- [ ] comment action 改走 repository
- [ ] like action 改走 repository
- [ ] upload service 改走 photo repository

---

## Milestone 3: Prisma schema 與 migration

### Schema

- [ ] `Photo.blurDataUrl`
- [ ] `Photo.location`
- [ ] `Photo.originalKey`
- [ ] `Photo.mediumKey`
- [ ] `Photo.thumbnailKey`
- [ ] `Photo.storageProvider`

### Prisma setup

- [ ] `npx prisma generate`
- [ ] `npx prisma migrate dev`

### Prisma repositories

- [ ] `albums/prisma-repository.ts`
- [ ] `photos/prisma-repository.ts`
- [ ] `comments/prisma-repository.ts`
- [ ] `likes/prisma-repository.ts`

### Migration scripts

- [ ] 建立 `scripts/migrate-json-to-prisma.ts`
- [ ] 遷移 albums
- [ ] 遷移 photos
- [ ] 遷移 comments
- [ ] 遷移 likes
- [ ] 輸出 migration summary

### Cutover

- [ ] `DATA_BACKEND=prisma`
- [ ] 首頁、相簿頁、照片頁正常
- [ ] admin recent uploads 正常
- [ ] admin comments / likes 正常

---

## Milestone 4: Storage abstraction

### Driver

- [ ] `storage/types.ts`
- [ ] `storage/local-driver.ts`
- [ ] `storage/r2-driver.ts`
- [ ] `storage/provider.ts`

### Image pipeline

- [ ] `image-pipeline.ts` 改為只產生 variants
- [ ] variants 包含 original / medium / thumbnail / blur / exif / dimensions

### Upload service

- [ ] 上傳服務改由 storage driver 寫檔
- [ ] 寫入後再由 photo repository 寫 metadata
- [ ] success summary 維持現有 UI 可用
- [ ] error 訊息保留可讀性

---

## Milestone 5: R2 cutover

### Env

- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME`
- [ ] `R2_PUBLIC_BASE_URL`
- [ ] `R2_ENDPOINT`

### Behavior

- [ ] `STORAGE_BACKEND=r2`
- [ ] 新上傳照片進 R2
- [ ] metadata 記住 key / URL
- [ ] 前台照片 URL 來自 `R2_PUBLIC_BASE_URL`

### Verification

- [ ] 上傳 1 張小圖成功
- [ ] 上傳多張圖成功
- [ ] 首頁顯示新照片
- [ ] 相簿頁顯示新照片
- [ ] 照片詳情頁顯示新照片

---

## Milestone 6: QA / verify

- [ ] `npx eslint .`
- [ ] `npx tsc --noEmit`
- [ ] `npx next build`
- [ ] `.session/verify.ps1`

### Manual regression

- [ ] `/`
- [ ] `/albums/[slug]`
- [ ] `/photos/[source]/[id]`
- [ ] `/admin/login`
- [ ] `/admin`
- [ ] upload flow
- [ ] album create/edit flow
- [ ] comment moderation list
- [ ] like summary list

---

## Feature 驗收對照

### P1-AUTH

- [ ] 管理登入頁存在
- [ ] 未登入不可進 `/admin`
- [ ] 登入後可維持 session
- [ ] 登出後 session 失效

### P1-DATA

- [ ] CRUD 經由 Prisma 完成
- [ ] `data/*.json` 已遷移
- [ ] 相簿與照片關聯查詢正常
- [ ] `prisma migrate dev` 可執行

### P1-STORAGE

- [ ] 上傳檔案進 R2 bucket
- [ ] URL 使用 R2 public base URL
- [ ] 儲存層可支援刪除對應 object
- [ ] `.env` 中 R2 設定完整
