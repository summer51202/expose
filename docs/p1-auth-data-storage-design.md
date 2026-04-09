# P1-AUTH / P1-DATA / P1-STORAGE 設計文件

## 1. 文件目的

這份文件要解決三件互相耦合的工作：

1. `P1-AUTH`: 讓 `/admin` 與所有 admin server actions 有一致且可維護的驗證機制。
2. `P1-DATA`: 把 runtime data source 從 `data/*.json` 切到 Prisma/PostgreSQL。
3. `P1-STORAGE`: 把照片檔案儲存從 `public/uploads` 切到 Cloudflare R2。

目標不是只把功能做出來，而是讓接下來的 `P1-UPLOAD`、`P2-ALBUM`、`P2-EXIF`、`P3-COMMENT`、`P3-LIKE` 不需要再重做底層。

---

## 2. 目前狀態摘要

### 已有基礎

- Admin login 頁面、login form、logout action 已存在。
- `src/lib/auth/session.ts` 已用 HMAC 簽名 cookie 做最小 session。
- `/admin` page 已呼叫 `requireAdminSession()`。
- `uploadPhotosAction()` 已在 action 內做 auth guard。
- Prisma schema 已有 `Album`、`Photo`、`Comment`、`PhotoLike` 四個 model。
- `.env.example` 已預留 `DATABASE_URL` 與 R2 相關環境變數。
- `sharp` 與 `exifr` 已安裝，圖片轉檔 pipeline 可用。

### 目前的主要限制

- Auth 仍是最小實作，憑證比較、secret 管理、錯誤處理、授權邊界都還可以再收斂。
- 資料層目前高度依賴 `manifest-repository.ts`。
- Upload pipeline 直接把圖寫進 `public/uploads`，資料寫進 `photos.json`。
- Prisma schema 和目前 UI DTO 不完全對齊。

### 目前 manifest 依賴面

直接依賴 JSON manifest 的模組包含：

- `src/lib/albums/*`
- `src/lib/photos/*`
- `src/lib/comments/*`
- `src/lib/likes/*`
- `src/app/admin/album-actions.ts`
- `src/app/photos/comment-actions.ts`
- `src/app/photos/like-actions.ts`
- `src/app/admin/engagement-actions.ts`
- `src/lib/uploads/upload-service.ts`

這代表 `P1-DATA` 不適合直接大爆改，而要先抽 repository / DAL，再做 backend swap。

---

## 3. 範圍與非範圍

### In Scope

- 單一管理員帳密登入。
- `/admin` 與所有 admin mutations 的授權保護。
- `albums.json`、`photos.json`、`comments.json`、`likes.json` 遷移到 PostgreSQL。
- Uploaded photos 的 metadata 改由 Prisma 讀寫。
- Uploaded photos 的檔案改存 R2。
- Query layer 維持目前 UI 所需的 DTO shape，避免大面積改 page/component。

### Out of Scope

- 多管理員帳號系統。
- OAuth / 第三方登入。
- 前台使用者帳號。
- Sample photos 完整入庫。
- R2 大規模清理 / 背景 job / CDN 最佳化。
- 圖片刪除與版本回收完整生命週期管理。

---

## 4. 關鍵設計決策

### Decision A: P1-AUTH 先維持單一 admin 帳密，不引入完整 auth library

原因：

- 目前需求只有站長後台，不是多使用者產品。
- 現有 login page 與 signed cookie 已足夠作為 MVP 基礎。
- 若此時引入大型 auth library，會把焦點從上傳、資料與儲存切走。

但要補強：

- 移除弱預設值依賴。
- 統一授權檢查入口。
- 每個 server action 都重新驗證 session。
- 讓 auth config 在 production 下 fail fast。

### Decision B: 採用 stateless cookie session，並以 DAL / guard 集中驗證

依據目前 Next.js 16 App Router 文件：

- `cookies()` 是 async API。
- auth check 不應只放在 layout。
- 每個 Server Action 都必須重新做 authorization。

因此保留 cookie session，但把使用方式收斂成：

- Page: `requireAdminSession()`
- Server Action: `requireAdminSession()`
- Route Handler: `requireAdminSession()` 或 `getAdminSessionOrNull()`

### Decision C: P1-DATA 先做 repository abstraction，再切 backend

不建議直接把 `queries.ts` 裡的 manifest 呼叫全部改成 Prisma，因為這會把：

- query 邏輯
- storage 轉換
- DTO mapping
- migration

全部混在一起，風險太高。

建議做法：

1. 先定義 repository contract。
2. 保留 manifest adapter。
3. 新增 Prisma adapter。
4. 由 provider / feature flag 切換 backend。

### Decision D: P1-STORAGE 採用 storage driver abstraction

`processUpload()` 不應知道資料寫去哪裡。它應該只負責：

- normalize image
- 產生 variants
- 抽出 exif
- 回傳待儲存的 buffers

真正寫入 local/R2 應由 storage driver 負責。

### Decision E: Sample photos 保持 DB 外部資料源

目前 sample photos 是 fallback 展示內容，且 comments / likes schema 只對 `Photo` table 關聯。

因此本階段明確切分：

- `uploaded` source: 走 Prisma + storage driver
- `sample` source: 保留程式內靜態資料

這樣可以避免為了 sample dataset 扭曲整個 schema。

---

## 5. 目標架構

```text
App Router page / action
  -> Auth guard / DAL
  -> Domain service
  -> Repository provider
      -> Manifest repository (legacy / migration only)
      -> Prisma repository (target)
  -> Storage driver
      -> Local public/uploads driver
      -> R2 driver
```

### 建議模組切分

```text
src/lib/
  auth/
    config.ts
    credentials.ts
    session.ts
    guards.ts
  data/
    provider.ts
    json-store.ts
  storage/
    types.ts
    provider.ts
    local-driver.ts
    r2-driver.ts
    url.ts
  albums/
    repository.ts
    manifest-repository.ts
    prisma-repository.ts
    queries.ts
  photos/
    repository.ts
    manifest-repository.ts
    prisma-repository.ts
    queries.ts
    dto.ts
  comments/
    repository.ts
    manifest-repository.ts
    prisma-repository.ts
  likes/
    repository.ts
    manifest-repository.ts
    prisma-repository.ts
  uploads/
    image-pipeline.ts
    upload-service.ts
```

---

## 6. Auth 設計

## 6.1 需求

- 未登入不能進 `/admin`。
- 未登入不能執行任何 admin server action。
- 登入成功建立 httpOnly cookie。
- 登出必須清 cookie。
- Production 不允許弱 secret / 預設帳密默默上線。

## 6.2 目標流程

```text
/admin/login
  -> submit credentials
  -> validate env-backed admin credentials
  -> create signed session cookie
  -> redirect /admin

/admin
  -> requireAdminSession()
  -> render admin page

admin server action
  -> requireAdminSession()
  -> perform mutation
  -> revalidatePath()
```

## 6.3 建議調整

### config / env

- `AUTH_SECRET` 在 production 必填，長度不足直接 throw。
- `ADMIN_PASSWORD="change-me"` 在 production 視為 misconfiguration。
- 提供 `getAuthConfig()`，集中處理 env parsing 與驗證。

### credentials compare

- 帳密比對改為 timing-safe compare，避免直接字串比較。
- login action 回傳統一錯誤訊息，不暴露帳號或密碼哪個錯。

### session payload

建議 payload 保持最小：

```ts
type AdminSessionPayload = {
  username: string;
  role: "admin";
  expiresAt: number;
};
```

### guards

- `getAdminSessionOrNull()`
- `requireAdminSession()`
- `requireAdminSessionForAction()` 可選，不一定要拆第二層

### optional optimization

可選擇加 `src/proxy.ts` 對 `/admin/:path*` 做 optimistic redirect，但不能取代 page/action 內的真實檢查。

---

## 7. Data 設計

## 7.1 現況與 schema gap

目前 `PhotoRecord` 與 Prisma `Photo` model 不一致。

### 現有 `PhotoRecord`

- `id`
- `title`
- `description`
- `location?`
- `shotAt?`
- `albumName?`
- `albumSlug?`
- `exifData?`
- `createdAt`
- `width`
- `height`
- `originalUrl`
- `mediumUrl`
- `thumbnailUrl`
- `blurDataUrl?`
- `source`
- `albumId?`

### 目前 Prisma `Photo`

- `id`
- `albumId`
- `title`
- `description`
- `originalUrl`
- `mediumUrl`
- `thumbnailUrl`
- `width`
- `height`
- `exifData`
- `takenAt`
- `sortOrder`
- `createdAt`
- `updatedAt`

### 建議 Prisma schema 補強

至少新增：

- `blurDataUrl String?`
- `location String?`

建議同時補上 storage key 欄位，避免未來刪檔或搬移只能反解 URL：

- `originalKey String`
- `mediumKey String`
- `thumbnailKey String`
- `storageProvider String @default("local")`

`albumName` / `albumSlug` 不存 DB，改由 query join 產生 DTO。

`source` 不存 DB，uploaded records 在 DTO mapping 時固定給 `"uploaded"`。

## 7.2 Repository contract

以 `photos` 為例：

```ts
export interface PhotoRepository {
  listUploadedPhotos(): Promise<PhotoEntity[]>;
  getUploadedPhotoById(id: number): Promise<PhotoEntity | null>;
  createMany(input: CreatePhotoInput[]): Promise<PhotoEntity[]>;
  replaceAlbumRefs(albumId: number, nextPhotoIds: number[]): Promise<void>;
}
```

Albums / Comments / Likes 也採同樣模式。

## 7.3 Provider 切換方式

建議新增：

```env
DATA_BACKEND="json" | "prisma"
```

切換策略：

- local 開發早期可先用 `json`
- migration script 跑完後切 `prisma`
- 所有 page/action 維持呼叫 query/service，不直接知道 backend

## 7.4 Query / DTO 原則

頁面與元件只拿 DTO，不直接拿 Prisma model。

原因：

- 可以保留目前 UI shape。
- 可以隔離 `Date` / `string` / relation 差異。
- 可以減少 page 改動。

### 建議 DTO mapping

```text
Prisma row
  -> mapPhotoToGalleryPhoto()
  -> source = "uploaded"
  -> shotAt = takenAt?.toISOString()
  -> albumName = album?.name
  -> albumSlug = album?.slug
```

## 7.5 JSON -> Prisma migration 原則

### 遷移資料

- `albums.json`
- `photos.json`
- `comments.json`
- `likes.json`

### 遷移順序

1. albums
2. photos
3. comments
4. likes

### 關鍵原則

- 盡量保留既有 numeric IDs，避免現有 URL / JSON 關聯失效。
- migration script 要可重複執行或至少具備 idempotent 行為。
- 若遇到無效關聯，要輸出 report，不要 silent drop。
- 先 migrate uploaded data；sample data 不入庫。

### Migration script 建議位置

- `scripts/migrate-json-to-prisma.ts`
- `scripts/check-prisma-migration.ts`

---

## 8. Storage 設計

## 8.1 目標

- 原始圖 / medium / thumbnail 全部由 storage driver 寫入。
- DTO 最終仍提供 `originalUrl` / `mediumUrl` / `thumbnailUrl`。
- 切到 R2 後，前台不需要知道實際儲存提供者。

## 8.2 Driver contract

```ts
export interface StorageDriver {
  putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
    cacheControl?: string;
  }): Promise<{ key: string; url: string }>;

  deleteObjects?(keys: string[]): Promise<void>;
}
```

## 8.3 建議 storage key 命名

```text
photos/{yyyy}/{mm}/{baseName}/original.webp
photos/{yyyy}/{mm}/{baseName}/medium.webp
photos/{yyyy}/{mm}/{baseName}/thumbnail.webp
```

優點：

- 可讀性高
- 日後搬移方便
- 避免所有檔案都堆在單一 flat 目錄

## 8.4 Upload flow 調整

### 現況

```text
uploadPhotosAction
  -> requireAdminSession()
  -> uploadPhotos()
  -> processUpload()
  -> write /public/uploads
  -> saveManifestPhotos()
```

### 目標

```text
uploadPhotosAction
  -> requireAdminSession()
  -> uploadPhotos()
      -> validate files
      -> imagePipeline.buildVariants()
      -> storageDriver.putObject() x 3
      -> photoRepository.createMany()
  -> revalidate "/", "/admin"
```

## 8.5 Provider 切換方式

建議新增：

```env
STORAGE_BACKEND="local" | "r2"
```

說明：

- `local`: 仍可寫 `public/uploads`，方便本地快速開發
- `r2`: 正式或 staging 環境使用

## 8.6 R2 client 設計

Cloudflare R2 相容 S3 API，建議透過獨立模組處理：

- endpoint
- bucket
- access key
- secret key
- public base URL

`R2_PUBLIC_BASE_URL` 負責產生可公開存取的照片 URL。

---

## 9. 三個 feature 的整合 workflow

建議不要照 feature id 順序硬切成三段，而要照依賴拆成六個 milestone。

## Milestone 0: 設計與保護網

- 補齊 schema gap 決策
- 決定 `DATA_BACKEND` / `STORAGE_BACKEND`
- 定義 repository / storage interfaces
- 先把 verify checklist 定好

## Milestone 1: Auth hardening

- 整理 auth config
- 補 timing-safe compare
- 統一 `requireAdminSession()`
- 確保 admin actions 全部顯式驗證
- 完成 `/admin/login` -> `/admin` -> logout smoke test

## Milestone 2: Repository abstraction

- `albums/photos/comments/likes` 抽 interface
- manifest adapter 繼續可用
- `queries.ts` 改成只依賴 provider
- UI 不改資料 shape

## Milestone 3: Prisma backend

- 調整 Prisma schema
- migrate / generate
- 新增 Prisma repositories
- 加 migration script
- 切 `DATA_BACKEND=prisma`

## Milestone 4: Storage abstraction

- `image-pipeline` 改成回傳 variants buffers
- 新增 local / R2 driver
- 上傳服務接 storage provider

## Milestone 5: R2 cutover

- 上傳新檔至 R2
- 照片 metadata 改記錄 R2 key / URL
- 驗證前台能用 R2 URL 顯示

## Milestone 6: Cleanup and verification

- 跑 lint / tsc / build
- 跑 `.session/verify.ps1`
- 手動驗證登入、上傳、相簿、首頁、照片頁
- 更新 `features.json` / `progress.md`

---

## 10. 具體實作計畫

## Phase A: Auth

### A1. 調整 auth config

- 建立 `getAuthConfig()`
- 在 dev 可允許預設值，但 console warning
- 在 production 對弱 secret / 預設帳密直接 throw

### A2. 調整 login action

- 使用 timing-safe compare
- 保持 generic error message
- success 後 redirect `/admin`

### A3. 收斂授權邊界

檢查並保證以下檔案都顯式做 auth：

- `src/app/admin/page.tsx`
- `src/app/admin/upload-actions.ts`
- `src/app/admin/album-actions.ts`
- `src/app/admin/engagement-actions.ts`
- 任何未來新增的 admin route handlers

## Phase B: Data

### B1. 先定 entity / DTO mapping

- `AlbumEntity`
- `PhotoEntity`
- `CommentEntity`
- `PhotoLikeEntity`
- `GalleryPhoto`
- `AlbumSummary`

### B2. Repository abstraction

- 每個 domain 有 `repository.ts`
- `provider.ts` 根據 `DATA_BACKEND` 回傳 manifest 或 prisma repo

### B3. Prisma schema migration

建議一次補足 upload / browse 會用到的欄位，不要分兩次 migration：

- `Photo.blurDataUrl`
- `Photo.location`
- `Photo.originalKey`
- `Photo.mediumKey`
- `Photo.thumbnailKey`
- `Photo.storageProvider`

### B4. 實作 migration script

步驟：

1. 讀 JSON
2. 驗證 referential integrity
3. upsert albums
4. upsert photos
5. upsert comments
6. upsert likes
7. 輸出 summary

### B5. 切換 query read path

- `getAlbums()`
- `getAlbumBySlug()`
- `getGalleryPhotos()`
- `getRecentUploads()`
- `getPhotoBySourceAndId()`
- `getCommentsByPhoto()`
- `getLikeSummaryByPhoto()`

全部改為走 provider，不直接 import manifest repo。

## Phase C: Storage

### C1. 重構 image pipeline

把目前 `processUpload()` 拆成兩層：

- `buildImageVariants()`：產生 buffers、dimensions、blur、exif
- `persistImageVariants()`：由 storage driver 執行

### C2. 實作 local driver

作用：

- 保持現有 local 開發體驗
- 作為 R2 driver 對照組

### C3. 實作 R2 driver

責任：

- put object
- content type
- cache-control
- 回傳 public URL

### C4. 調整 upload service

`uploadPhotos()` 改成：

1. validate files
2. 查 album option
3. 建 variants
4. 寫 storage
5. 寫 DB
6. 回傳 summary

### C5. 保證寫入順序

建議：

- 先寫 storage，再寫 DB
- 若 DB 寫失敗，回報失敗並列出 orphaned keys 供人工清理

P1 不必先做完整 transaction + rollback，但要保留錯誤資訊。

---

## 11. 驗證計畫

## 自動驗證

- `npx eslint .`
- `npx tsc --noEmit`
- `npx next build`
- `.session/verify.ps1`

## 手動 smoke test

### Auth

- 未登入進 `/admin` 會被導到 `/admin/login`
- 錯誤帳密顯示 generic error
- 正確帳密可進 `/admin`
- logout 後重新進 `/admin` 會被擋下

### Data

- 首頁能讀出 uploaded photos
- 相簿頁能顯示正確 photo count
- 後台 recent uploads 正常
- comment / like admin summary 正常

### Storage

- 上傳 1 張圖成功
- 產生 original / medium / thumbnail
- DB metadata 正常寫入
- 前台圖片 URL 可正常開啟
- `STORAGE_BACKEND=r2` 時 URL 指向 `R2_PUBLIC_BASE_URL`

---

## 12. 風險與對策

## 風險 1: Prisma schema 與 UI DTO 不一致

對策：

- 明確引入 mapper function
- page / component 不直接吃 Prisma model

## 風險 2: migration 後 sample / uploaded source 行為混亂

對策：

- 規定 DB 只承接 `uploaded`
- `sample` 維持靜態資料源

## 風險 3: storage 寫入成功但 DB 寫入失敗

對策：

- 先記錄 keys
- 失敗訊息帶出 orphaned keys
- 後續可再補 cleanup script

## 風險 4: auth 檢查只放在 page，忘記放 action

對策：

- code review checklist 明確要求每個 admin action 內呼叫 `requireAdminSession()`
- 不依賴 layout 保護

## 風險 5: 一次切太多導致 debug 困難

對策：

- 先抽 interface
- 再做 Prisma
- 最後做 R2
- 每個 milestone 都要可 build、可 smoke test

---

## 13. 建議起手順序

如果你下一個 session 就要開始做，建議順序是：

1. 先做 `P1-AUTH` hardening，因為它是所有 admin mutation 的安全前提。
2. 再做 `P1-DATA` abstraction + Prisma read/write，因為 `P1-STORAGE` 的 metadata 最終也要落 DB。
3. 最後做 `P1-STORAGE`，把上傳流程改成 storage-driver + photo-repository。

一句話總結：

**先把 guard 立起來，再把 metadata 落到 DB，最後才切真正的檔案儲存。**
