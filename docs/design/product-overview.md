# Expose — 產品介紹報告

> 版本：v0.1 | 最後更新：2026-04-09

---

## 一、產品背景

**Expose** 是一個為攝影師量身打造的個人作品展示網站。

現有的社群平台（Instagram、500px、Flickr）雖然提供了龐大的曝光管道，但它們的版面設計以演算法推薦和社交互動為優先，攝影師的作品往往淹沒在資訊流中，難以形成完整的個人品牌形象。

Expose 的出發點是：**讓攝影師擁有一個完全由自己掌控的作品空間**，無廣告、無演算法干擾，以作品本身為絕對主角。

---

## 二、目標使用者

| 角色 | 描述 |
| --- | --- |
| **攝影師（管理員）** | 擁有網站的個人攝影師，負責上傳照片、管理相簿、審核留言 |
| **訪客（瀏覽者）** | 欣賞攝影作品的一般大眾，可瀏覽照片、按讚、留言，無需註冊帳號 |

---

## 三、核心功能

### 3.1 作品展示

- **首頁照片牆**：全出血 Hero 照片輪播（5 秒自動切換），搭配瀑布流照片網格
- **相簿分類**：照片可歸屬到不同相簿，相簿頁面獨立呈現
- **照片詳情頁**：暗色沉浸式設計，照片舞台佔 85% 螢幕高度，最大化視覺衝擊
- **幻燈片模式**：全螢幕瀏覽，底部縮圖帶可展開/收合，支援鍵盤切換

### 3.2 照片管理（後台）

- **批次上傳**：支援拖拉多張照片同時上傳
- **自動多尺寸處理**：上傳後自動產生 original / medium（1200px）/ thumbnail（400px）三種尺寸，統一輸出 WebP 格式
- **EXIF 解析**：自動讀取相機型號、焦距、光圈、快門速度、ISO 等拍攝資訊
- **相簿管理**：建立、編輯相簿，設定封面照片，調整排序
- **留言管理**：後台可審核、刪除不當留言

### 3.3 訪客互動

- **按讚**：無需登入，基於 localStorage + IP 防止重複按讚
- **留言**：填寫暱稱即可留言，無需註冊帳號
- **隱私保護**：訪客 IP 以 hash 形式記錄，不對外顯示

---

## 四、設計理念

### 4.1 沉浸式雙主題

Expose 採用「**混合主題**」設計策略：

- **瀏覽頁面**（首頁、相簿頁）：暖白色調（`#f7f2e8`），如同展覽館的白牆
- **照片詳情頁**：深黑色調（`#0c0c0c`），如同暗房，讓照片的色彩與細節完全浮現

主題切換透過 Next.js Route Group 靜態決定，無 JavaScript 動態切換，確保效能最佳。

### 4.2 UI 設計原則

- 照片是主角，UI 是背景
- 移除所有不必要的裝飾性元素（卡片邊框、陰影、說明文字）
- 動畫以 CSS Transition 為主，僅在高價值節點（幻燈片切換）使用 Framer Motion
- 全站 UI 文字統一英文，強調國際性

---

## 五、技術架構

### 5.1 技術選型

| 層次 | 技術 | 選擇理由 |
| --- | --- | --- |
| **前端框架** | Next.js 16 (App Router) | SSR/SSG 兼顧 SEO 與效能；Server Actions 簡化 API 層 |
| **UI 框架** | React 19 | 生態成熟，搭配 Next.js 最佳 |
| **樣式** | Tailwind CSS 4 | Utility-first，快速迭代；CSS token 系統支援雙主題 |
| **動畫** | Framer Motion 12 | 照片切換的 AnimatePresence crossfade 效果 |
| **ORM** | Prisma 6 | 型別安全的資料庫存取，schema-first 設計 |
| **資料庫** | SQLite | 輕量、無需額外服務，適合個人網站規模 |
| **圖片處理** | Sharp | 高效能伺服器端 resize + WebP 轉換 |
| **EXIF 解析** | exifr | 輕量、支援多種相機格式 |
| **物件儲存** | Cloudflare R2 | S3-compatible API，免費額度充裕，無出口流量費用 |
| **部署** | Railway | 一鍵部署 Node.js，支援持久化 Volume 掛載 SQLite |

### 5.2 系統架構圖

```
訪客 / 管理員
      │
      ▼
 Next.js App (Railway)
 ┌────────────────────────────────────────┐
 │  App Router Pages (SSR)                │
 │    ↓                                   │
 │  Server Components                     │
 │    ↓                                   │
 │  Server Actions (表單提交)              │
 │    ↓                                   │
 │  Query / Repository Layer (Prisma)     │
 │    ↓                                   │
 │  SQLite DB (Railway Volume /data)      │
 └────────────────────────────────────────┘
      │
      │ 圖片上傳 / 讀取
      ▼
 Cloudflare R2 (物件儲存)
 ├── original (原始解析度)
 ├── medium (1200px WebP)
 └── thumbnail (400px WebP)
```

### 5.3 資料模型

```
Album (相簿)
  ├── id, name, slug, description
  ├── coverPhotoId → Photo
  └── photos[] → Photo[]

Photo (照片)
  ├── id, title, description, location
  ├── originalUrl, mediumUrl, thumbnailUrl  → R2
  ├── storageProvider (r2 / local)
  ├── width, height, blurDataUrl
  ├── exifData (JSON)
  ├── takenAt, sortOrder
  ├── comments[] → Comment[]
  └── likes[] → PhotoLike[]

Comment (留言)
  ├── id, photoId, nickname, content
  └── ipHash (隱私保護)

PhotoLike (按讚)
  ├── id, photoId, visitorId
  └── unique(photoId, visitorId)
```

---

## 六、開發進度

### Phase 1 — MVP（已完成）

| Feature | 狀態 |
| --- | --- |
| 專案初始化（Next.js + Tailwind + Prisma） | ✅ 完成 |
| 管理員驗證系統（帳密登入 + Cookie Session） | 🔄 進行中 |
| 照片上傳與多尺寸處理 | 🔄 進行中 |
| 首頁照片牆（瀑布流 + RWD） | 🔄 進行中 |
| 照片放大檢視 | 🔄 進行中 |
| 資料層遷移（JSON → Prisma + SQLite） | ✅ 完成 |
| 儲存層遷移（本地 → Cloudflare R2） | ✅ 完成 |

### Phase 2 — 核心體驗提升（規劃中）

| Feature | 狀態 |
| --- | --- |
| 相簿分類功能 | 🔄 進行中 |
| EXIF 資訊讀取與顯示 | 📋 待開始 |
| 幻燈片瀏覽模式 | 📋 待開始 |
| 照片懶載入 | 📋 待開始 |

### Phase 3 — 社交互動（規劃中）

| Feature | 狀態 |
| --- | --- |
| 訪客留言功能 | 📋 待開始 |
| 按讚/喜歡功能 | 📋 待開始 |
| 留言管理後台 | 📋 待開始 |

### Phase UI — 沉浸式改版（已完成）

| Feature | 狀態 |
| --- | --- |
| 雙主題 CSS Token 系統 | ✅ 完成 |
| 全站 Header 改版 + 英文化 | ✅ 完成 |
| Hero Section 全出血 + 照片輪播 | ✅ 完成 |
| 照片牆視覺改版（移除卡片邊框） | ✅ 完成 |
| 照片詳情頁暗色沉浸式改版 | ✅ 完成 |
| 幻燈片底部縮圖帶 + Framer Motion | ✅ 完成 |

---

## 七、部署架構

```
GitHub Repository
      │ push to main
      ▼
Railway (CI/CD 自動觸發)
  ├── Build: npm run build
  ├── Start: npx prisma migrate deploy && npm run start
  ├── Volume: /data/expose.db (SQLite 持久化)
  └── Environment Variables:
        DATABASE_URL, AUTH_SECRET
        ADMIN_USERNAME, ADMIN_PASSWORD
        R2_ACCOUNT_ID, R2_ACCESS_KEY_ID
        R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
        R2_PUBLIC_BASE_URL, R2_ENDPOINT
        DATA_BACKEND=prisma
        STORAGE_BACKEND=r2

Cloudflare R2 Bucket: expose
  └── uploads/
        ├── {timestamp}-{uuid}-{filename}-original.webp
        ├── {timestamp}-{uuid}-{filename}-medium.webp
        └── {timestamp}-{uuid}-{filename}-thumb.webp
```

---

## 八、未來規劃

| Feature | 說明 |
| --- | --- |
| **自訂圖片網域** | 將 R2 public URL 換成 `img.<your-domain>`，提升品牌一致性 |
| **中英文雙語（i18n）** | 使用 next-intl，支援 `/en` 與 `/zh` 路由，語言切換器 |
| **PostgreSQL 遷移** | 若流量增長，從 SQLite 遷移到 PostgreSQL，架構已預留切換點 |
| **自動備份** | SQLite DB 定期備份到 R2 或其他儲存 |
| **圖片 CDN** | 搭配 Cloudflare CDN 加速全球圖片讀取 |

---

## 九、快速啟動

### 本機開發

```bash
# 安裝依賴
npm install

# 設定環境變數（複製 .env.example）
cp .env.example .env

# 初始化資料庫
npx prisma migrate dev

# 啟動開發伺服器
npm run dev
```

### 生產部署（Railway）

1. 建立 Railway 專案，連接 GitHub repository
2. 新增 Railway Volume，掛載到 `/data`
3. 設定環境變數（參見 `docs/runbooks/railway-runbook.md`）
4. 設定 Start Command：`npx prisma migrate deploy && npm run start`
5. 觸發部署，完成後開啟 `/admin/login` 驗證

詳細步驟請參閱 [`docs/runbooks/railway-runbook.md`](../runbooks/railway-runbook.md)。

---

*本文件由 Coding Agent 於 2026-04-09 生成，基於 `.session/progress.md`、`.session/features.json`、`docs/design/architecture.md` 及 `package.json` 整合撰寫。*
