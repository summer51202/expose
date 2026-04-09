# Architecture

## 文件目的
這份文件描述目前專案「實際正在運作的架構」，並標出未來遷移到 Prisma / PostgreSQL / R2 時應該怎麼切。

## 技術基底
- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Server Actions
- Prisma schema 已建立
- 目前 runtime data source 為 JSON files

## 高層架構
```text
App Router Pages
  -> Server Components
  -> Client Components（表單 / viewer / 互動）
  -> Server Actions
  -> Query / Repository Layer
  -> JSON Store / Upload Files
```

## 目前模組分層

### 1. App Router
位置：`src/app`

責任：
- 定義 route 與 page entry
- 聚合 query 結果
- 將資料分發到 components

目前主要頁面：
- `src/app/page.tsx`
- `src/app/albums/[slug]/page.tsx`
- `src/app/photos/[source]/[id]/page.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/admin/page.tsx`

### 2. Components
位置：`src/components`

責任：
- UI 區塊與互動元件
- 依功能分資料夾拆分：`home`、`gallery`、`admin`、`comments`、`likes`

設計上目前偏 feature-oriented，而不是 atomic design。這對小型專案是合理的，因為找功能入口比找共用元件更直覺。

### 3. Server Actions
位置：
- `src/app/admin/upload-actions.ts`
- `src/app/admin/login/actions.ts`
- `src/app/admin/album-actions.ts`
- `src/app/admin/engagement-actions.ts`
- `src/app/photos/comment-actions.ts`
- `src/app/photos/like-actions.ts`

責任：
- 接收表單輸入
- 驗證資料
- 呼叫 service / repository
- `revalidatePath`

建議邊界：
- action 不直接處理太多資料格式轉換
- 商業規則盡量下沉到 `lib/`，避免 action 變胖

### 4. Query / Repository Layer
位置：`src/lib`

目前分工：
- `queries.ts`：讀取與組裝頁面所需資料
- `manifest-repository.ts`：對應 JSON 檔的增刪改查
- `identity.ts`：處理 visitorId / ipHash
- `session.ts`：處理後台 session
- `image-pipeline.ts`、`upload-service.ts`：處理圖片上傳流程

這層是現在最重要的協作邊界。大部分新功能都應先想清楚是加在：
- page
- action
- query
- repository
- service

而不是直接把邏輯塞進 component。

### 5. Storage Layer
目前：
- `data/albums.json`
- `data/photos.json`
- `data/comments.json`
- `data/likes.json`

未來目標：
- Prisma + PostgreSQL 作為主要資料來源
- Cloudflare R2 作為正式圖片儲存

## 目前資料流

### 首頁讀取
```text
page.tsx
  -> getGalleryPhotos()
  -> getAlbums()
  -> render Hero / AlbumStrip / PhotoWall
```

### 照片上傳
```text
UploadForm
  -> uploadPhotosAction()
  -> requireAdminSession()
  -> uploadPhotos()
  -> processUpload()
  -> saveManifestPhotos()
  -> revalidate "/" 與 "/admin"
```

### 留言新增
```text
CommentForm
  -> createCommentAction()
  -> getPhotoBySourceAndId()
  -> getVisitorHash()
  -> appendManifestComment()
  -> revalidate photo page
```

### 按讚切換
```text
LikeButton
  -> togglePhotoLikeAction()
  -> getOrCreateVisitorId()
  -> listManifestLikes()
  -> append or replace likes
  -> revalidate photo page
```

## 現況與目標架構的差異
| 面向 | 目前 | 目標 |
| --- | --- | --- |
| 資料庫 | JSON files | Prisma + PostgreSQL |
| 圖片儲存 | 本機 uploads 流程 | Cloudflare R2 |
| 互動資料 | comments.json / likes.json | 正式 tables + moderation policy |
| 查詢層 | queries + manifest repository | queries + Prisma repository |

## UI 架構 — Direction C 雙主題（新增於 2026-03-27）

### 設計決策

採用 **Direction C**：首頁與相簿頁使用淺色主題，照片詳情頁使用暗色主題。
主題切換**不使用 JavaScript 動態切換**，而是透過 Next.js route group layout 分離靜態決定。

### CSS Token 系統

`src/app/globals.css` 定義兩組 token：

```css
/* 淺色主題（預設，browse 頁面） */
:root {
  --background: #f7f2e8;
  --foreground: #1f1b16;
  --panel: rgba(255, 251, 245, 0.78);
  --line: rgba(92, 70, 44, 0.18);
  --surface: rgba(255, 255, 255, 0.80);
}

/* 暗色主題（照片詳情頁） */
[data-theme="dark"] {
  --background: #0c0c0c;
  --foreground: #f5f5f5;
  --panel: rgba(255, 255, 255, 0.06);
  --line: rgba(255, 255, 255, 0.10);
  --surface: rgba(255, 255, 255, 0.04);
}
```

照片詳情頁的 layout 在 `<main>` 或 `<body>` 上加 `data-theme="dark"`，子元件繼承 token，無需個別指定顏色。

### Route Group Layout 分離

```text
src/app/
├── layout.tsx                     ← root layout（HTML shell，無主題）
├── (browse)/                      ← route group，淺色主題
│   ├── layout.tsx                 ← 套用淺色 bg token、max-width wrapper
│   ├── page.tsx                   ← 首頁
│   └── albums/
│       └── [slug]/page.tsx        ← 相簿頁
└── photos/
    └── [source]/
        └── [id]/
            ├── layout.tsx         ← 套用 data-theme="dark"、暗色 bg
            └── page.tsx           ← 照片詳情頁
```

Admin 路由不在兩個 group 之內，維持獨立主題。

### 動畫層策略

**CSS Transitions（所有元件的基礎）**：
- hover 狀態：`opacity`、`scale`、`color`、`background-color`
- 照片牆 PhotoCard overlay：`opacity 0 → 1` on hover
- 幻燈片縮圖帶展開/收合：`max-height` transition

**Framer Motion（選擇性用於高價值節點）**：
- 照片詳情頁進場：照片舞台與右側 panel 的 fade + slide-up
- 幻燈片照片切換：`AnimatePresence` + `opacity` crossfade
- 安裝：`npm i framer-motion`（~30KB gzipped）
- 僅在這兩個 client component 中引入，不做全局 motion config

**不使用的方案**：
- Next.js View Transitions API（目前仍實驗性，不穩定）
- 全局 page transition（複雜度過高，性價比低）

### Hero Section 輪播架構

HeroSection 改為 client component，接收 `photos: GalleryPhoto[]` prop。

```text
page.tsx (server)
  -> getGalleryPhotos()
  -> <HeroSection photos={photos} />

HeroSection (client)
  -> useState(currentIndex)
  -> useEffect: setInterval(5000) -> 遞增 currentIndex
  -> 渲染兩層 <Image>（當前 + 下一張），CSS opacity crossfade
  -> 訪客無需互動
```

選片邏輯：使用 `getGalleryPhotos()` 的前 N 張（或全部），server side 決定，client side 控制輪播。

### 幻燈片縮圖帶架構

縮圖帶為 SlideshowViewer 內的獨立 UI 區塊：

```text
SlideshowViewer
  ├── 大圖區（Framer Motion AnimatePresence）
  ├── HUD（進度 / 播放控制 / 關閉）
  └── FilmStrip（縮圖帶）
      ├── useState(isThumbsVisible = true)
      ├── [⌄/⌃] toggle button
      ├── 展開：橫向捲動縮圖列表，當前縮圖 scrollIntoView
      └── 收合：CSS max-height: 0，顯示 dot indicator
```

### Interactions Panel 架構（照片詳情頁）

原本的 5 個獨立 Panel 合併為 3 個區塊：

```text
舊版（5 個 Panel）：
  照片資訊 | 按讚說明+LikeButton | EXIF | 白話說明 | 留言+CommentForm

新版（3 個區塊，在同一個右側欄）：
  ① 基本資訊（title、description、location、date）
  ② Interactions
      header: ♡ N · 💬 N
      LikeButton
      ──────────
      CommentForm
      CommentList
  ③ EXIF（Collapsible，預設收合）
```

移除：「按讚說明」段落、「給新手的白話說明」Panel。

---

## 遷移策略建議

### Strategy A：維持 API 介面，替換 repository 實作
做法：
- 保留 `queries.ts` 呼叫方式
- 保留 `upload-service.ts` 對外介面
- 把 `manifest-repository.ts` 的底層改成 Prisma / R2

優點：
- 對 page 與 component 影響最小
- 最適合漸進式改造

風險：
- 若現有 JSON 型別與 Prisma schema 差太多，中間 mapping 會暫時變複雜

### Strategy B：先完成 domain model 對齊，再搬資料源
做法：
- 先統一 photo / album / comment / like 的型別欄位
- 再做 repository swap

優點：
- 長期維護較乾淨

風險：
- 短期需要花時間整理型別與歷史資料

## 協作規則建議
1. Page 只負責組裝，不放資料寫入邏輯。
2. Form submit 一律走 server action，不直接在 client component 操作儲存層。
3. 新增資料來源時，優先延伸 repository，而不是讓 page 知道 JSON / Prisma 細節。
4. 若要導入 Prisma，先保住 `queries.ts` 的回傳型別，避免 UI 全面重寫。
