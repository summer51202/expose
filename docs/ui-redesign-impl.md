# UI 改版實作指南

## 文件目的

這份文件是 Coding Agent session 的逐步執行指南，補充 `features.json` 的 acceptance_criteria 不足之處。
每個 ticket 都列出：需要改動的確切檔案、改動順序、技術注意事項。

設計規格見 `docs/mockups.md`、架構說明見 `docs/architecture.md`。

**執行順序必須嚴格遵守**（有依賴關係）：
```
UI-THEME → UI-NAV → UI-HERO → UI-GALLERY
                  → UI-PHOTOPAGE → UI-SLIDESHOW
```

---

## Ticket UI-THEME：雙主題 CSS Token + Route Group Layout

**目標**：建立 light / dark 兩組 CSS token，並以 route group 分離 browse 頁與 photo 詳情頁的 layout。

### 前置確認
- `src/app/layout.tsx`：目前是 HTML shell，body 只有 `min-h-full flex flex-col`，這個保持不動。
- `src/app/globals.css`：目前只有 `:root` 的 light token。

### Step 1：更新 `src/app/globals.css`

在現有 `:root` block 之後新增 dark theme token block：

```css
[data-theme="dark"] {
  --background: #0c0c0c;
  --foreground: #f5f5f5;
  --panel: rgba(255, 255, 255, 0.06);
  --line: rgba(255, 255, 255, 0.10);
}
```

### Step 2：建立 `(browse)` route group

在 `src/app/` 下建立 `(browse)/` 資料夾（括號讓 Next.js 知道這是 route group，不影響 URL）。

**需要移動的檔案**（等同於 `git mv`）：

| 原路徑 | 新路徑 |
|---|---|
| `src/app/page.tsx` | `src/app/(browse)/page.tsx` |
| `src/app/albums/` | `src/app/(browse)/albums/` |

albums 資料夾下的所有檔案（含 `[slug]/page.tsx` 和 `[slug]/not-found.tsx`）整個搬移。

### Step 3：建立 `src/app/(browse)/layout.tsx`

這個 layout 負責：
1. 淺色主題（不需要額外 token，`:root` 預設就是 light）
2. 套用 `bg-background text-foreground` 讓 Tailwind token 生效

```tsx
export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-col bg-background text-foreground">{children}</div>;
}
```

> **注意**：不要在這裡加 max-width 或 padding，那些由各 page 的 `<main>` 自己管。

### Step 4：建立 `src/app/photos/[source]/[id]/layout.tsx`

這個 layout 負責套用暗色主題：

```tsx
export default function PhotoDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="flex min-h-full flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
```

`photos/` 的 `not-found.tsx` 已在同層，不受影響。

### Step 5：更新 root `src/app/layout.tsx`

- 把 `lang="zh-Hant"` 改為 `lang="en"`
- `<body>` 移除 `bg-background text-foreground`（改由各 layout 負責），只保留 `min-h-full flex flex-col`

### 驗證
- 首頁背景仍為 `#f7f2e8`（amber/stone 暖白）
- `/photos/` 下的頁面背景為 `#0c0c0c`，文字白色
- `/admin` 不受影響

---

## Ticket UI-NAV：全站 Header + 英文化

**目標**：建立極簡透明 Header 元件；全站 UI 文字改為英文。

### 前置確認
- 目前沒有 Header 元件，各 page 直接開始 `<main>`。

### Step 1：建立 `src/components/layout/site-header.tsx`

功能規格：
- 預設：`position: fixed; top: 0; left: 0; right: 0; z-index: 40`
- 左側：網站名稱 EXPOSE（連結到 `/`）
- 右側：`Albums`（連結到第一個相簿，或先 hardcode `/albums`）
- 在 `(browse)` 頁面上方：透明背景、白色文字（因為 Hero 照片在背後）
- 捲動後：背景轉為對應主題色（light theme 轉白色 + border-bottom，dark theme 轉 `#111`）
- 捲動偵測：`useEffect` + `window.addEventListener('scroll', ...)` 監聽 scrollY，超過 80px 時加上不透明背景

> **注意**：Header 是 `"use client"` 元件（需要捲動偵測）。

### Step 2：在 `(browse)/layout.tsx` 加入 Header

```tsx
import { SiteHeader } from "@/components/layout/site-header";

export default function BrowseLayout({ children }) {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <SiteHeader theme="light" />
      {children}
    </div>
  );
}
```

### Step 3：在 `photos/[source]/[id]/layout.tsx` 加入 Header（暗色版）

```tsx
<SiteHeader theme="dark" />
```

SiteHeader 根據 `theme` prop 決定透明狀態下的文字顏色與捲動後的背景色。

### Step 4：各 page 的 `<main>` 加上 `pt-16`（Header 的高度補償）

Header 是 fixed，page 內容需要有 padding-top 避免被蓋住。
受影響的 page（需加 `pt-16` 或 `pt-20`）：
- `src/app/(browse)/page.tsx`
- `src/app/(browse)/albums/[slug]/page.tsx`
- `src/app/photos/[source]/[id]/page.tsx`

### Step 5：英文化 — `src/config/site.ts`

重新整理 siteConfig：
- `name`: `"Expose"` 或攝影師名字
- `description`: 改為英文描述
- 移除 `phases`、`foundationCards`、`explainers`（這些只給 Hero 舊版用）

### Step 6：英文化 — 逐一更新各元件文字

以下元件的中文 hardcode 字串改為英文，**只改顯示文字，不改邏輯**：

| 元件 | 要改的字串（範例） |
|---|---|
| `src/app/(browse)/albums/[slug]/page.tsx` | 「回到首頁」→ Back · 「照片數量：」→ `{n} photos` · 移除說明用的 Panel |
| `src/components/home/album-strip-section.tsx` | 「相簿分類」→ ALBUMS · 「先依主題看照片」→ Browse by Album · 「打開相簿」→ View Album |
| `src/components/home/photo-wall-section.tsx` | Section heading 改為 LATEST WORK，移除 description 文字 |
| `src/components/ui/section-heading.tsx` | 確認元件本身無 hardcode 中文（只是 prop 接收） |
| `src/components/comments/comment-form.tsx` | 「你的暱稱」→ Name · 「留言內容」→ Comment · 「送出留言」→ Submit · 說明文字改英文 |
| `src/components/comments/comment-list.tsx` | 「還沒有留言」→ No comments yet... · 日期格式改為 `toLocaleString("en-US")` |
| `src/components/likes/like-button.tsx` | 「目前按讚數」→ 移除（整合後不再需要大字體數字）· 「按讚這張照片」→ Like · 「取消按讚」→ Unlike |

### 驗證
- Header 在首頁 Hero 上方為透明
- 捲動後 Header 背景顯示
- 所有可見 UI 文字為英文（Admin 後台中文可暫時保留）

---

## Ticket UI-HERO：Hero Section 全出血改版

**目標**：Hero 改為全出血照片背景（100vh），client-side 自動輪播，移除 ExplainersSection。

### 前置確認
- `src/components/home/hero-section.tsx`：目前是有 Panel 邊框的靜態版本，完全重寫。
- `src/app/(browse)/page.tsx`：需要調整傳入 props。

### Step 1：更新 `src/app/(browse)/page.tsx`

- 把 `photos` 也傳入 `<HeroSection photos={photos} />`（目前 HeroSection 不接受 props）
- 移除 `<ExplainersSection />` 那一行（import 也刪掉）

### Step 2：完全重寫 `src/components/home/hero-section.tsx`

新版規格：
- 改為 `"use client"` component（需要 interval 控制輪播）
- Props：`photos: GalleryPhoto[]`
- 高度：`h-screen`（100vh）
- 兩層 `<Image>` 疊放（absolute + inset-0），用 CSS opacity 做 crossfade
- 輪播邏輯：`useEffect` + `setInterval(5000)` 遞增 currentIndex，circular
- 底部疊一層暗色漸層 overlay：`linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.7) 100%)`
- 左下角：攝影師名稱 + 一行介紹（從 siteConfig 讀取）
- 右下角（或底部中央）：`↓ View Portfolio` 按鈕，點擊後平滑捲動到照片牆（`scrollIntoView`）

技術細節：
- 照片 0 和照片 1 同時 render，透過 `opacity-0` / `opacity-100` + `transition-opacity duration-1000` 切換
- 使用 `next/image` 的 `fill` + `object-cover`
- 前兩張照片設 `priority={true}`，其餘 `priority={false}`
- 照片 0 張時：顯示純色漸層 fallback（不 crash）

### Step 3：刪除 `src/components/home/explainers-section.tsx`

這個元件整個刪除（不再使用）。

### 驗證
- 首頁第一屏是全出血照片
- 5 秒後平滑切換到下一張
- 左下角有攝影師資訊
- 「View Portfolio」點擊後捲動到照片牆
- 手機版（375px）照片正確 cover，文字不被截切

---

## Ticket UI-GALLERY：照片牆視覺改版

**目標**：移除 PhotoCard 卡片邊框，改為純照片瀑布流；hover 時顯示 overlay 動畫；Album Strip 改為有封面照的卡片。

### Step 1：重寫 `src/components/gallery/photo-card.tsx`

移除：
- 外層的 `rounded border border-line bg-white/75 p-3 shadow-...`（整個 article 的樣式）
- 內層的 `rounded overflow-hidden`（保留 `relative overflow-hidden`）

改為：
- `article` 不加任何 background、border、shadow、padding
- 點擊區域直接是照片（PhotoStage）
- hover overlay（bottom 漸層 + title）的動畫改為 `opacity-0 group-hover:opacity-100 transition-opacity duration-300`
- source badge（sample photo / uploaded photo）移除，觀賞者不需要知道這個
- 保留 `location` badge 和 title overlay

photo-card 改版後的視覺結構：
```
<article className="mb-4 break-inside-avoid">
  <Link href="..." className="group block relative overflow-hidden rounded-[1.25rem]">
    <PhotoStage photo={photo} />
    {/* overlay（hover 才顯示） */}
    <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
      <h3>{photo.title}</h3>
      <p>{photo.shotAt}</p>
    </div>
  </Link>
</article>
```

### Step 2：更新 `src/components/home/photo-wall-section.tsx`

- Section heading eyebrow / title 改為英文（LATEST WORK）
- 移除 description 說明文字（開發說明，不是給觀賞者看的）

### Step 3：重寫 `src/components/home/album-strip-section.tsx`

目前是純文字 Panel 卡片，改為有封面照的卡片（若相簿有 coverPhoto，顯示照片；若無，顯示純色 placeholder）。

AlbumSummary 型別確認是否有 `coverPhotoUrl` 欄位（`src/types/album.ts`）；若沒有，先用純色 placeholder 做佔位，不要 crash。

新卡片樣式：
```
<Link className="group block overflow-hidden rounded-[1.75rem] relative aspect-[4/3]">
  {/* 封面照或 placeholder */}
  <div className="absolute inset-0 bg-stone-800" />
  {/* 底部 overlay */}
  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
    <p className="text-xs tracking-widest text-white/70 uppercase">Album</p>
    <h3 className="text-white font-semibold">{album.name}</h3>
    <p className="text-sm text-white/70">{album.photoCount} photos</p>
  </div>
</Link>
```

### Step 4：`src/components/gallery/photo-grid.tsx`

把 `gap-4` 確認合適（columns masonry），視覺上不需要大改。

### 驗證
- 照片牆：無白色卡片邊框，純照片網格
- hover 照片：底部漸層 overlay 淡入顯示標題
- Album Strip：封面照卡片（或純色 placeholder）

---

## Ticket UI-PHOTOPAGE：照片詳情頁暗色沉浸式改版

**目標**：暗色主題（已由 UI-THEME 完成）、重構 Panel 結構為 3 個區塊、Interactions 合併按讚與留言、EXIF collapsible。

### 前置確認
- `src/app/photos/[source]/[id]/page.tsx`：目前有 6 個 Panel，需要大幅重構。
- `src/components/likes/like-button.tsx`：需要改為緊湊版本。
- `src/components/comments/comment-form.tsx` 和 `comment-list.tsx`：需要暗色主題樣式。

### Step 1：更新 page 頂部的導航 row

目前：
```
← 回到照片牆  |  [幻燈片] [上一張] [下一張]
```

改為：
```
← Back     Album Name     ← Prev  Next →  [Slideshow]
```

Header 位置：使用 Header 元件（UI-NAV 完成後）。移除目前 page 裡的 `<Link href="/">回到照片牆</Link>` 和獨立導航列，改為更簡潔的 inline 導航：
- 「← Back」連結回到 `/`（或 referer）
- Prev / Next 改為 icon 箭頭（← →），不用 `<Button>` 元件，改為 `<Link>` + SVG 箭頭 icon

### Step 2：更新 `<section>` 的欄位結構

目前是 `lg:grid-cols-[1.3fr_0.7fr]`，調整為：
- 左欄（照片）：`min-h-[85vh]` 確保照片佔據大部分高度
- 右欄：移除所有舊 Panel，改為以下 3 個區塊

### Step 3：右欄 — 區塊一：基本資訊

```tsx
<div>
  <p className="text-xs tracking-widest text-white/40 uppercase">{photo.albumName ?? "Photography"}</p>
  <h1 className="mt-2 text-2xl font-semibold text-white">{photo.title}</h1>
  {photo.location && <p className="mt-1 text-sm text-white/60">{photo.location}</p>}
  {photo.shotAt && <p className="mt-1 text-sm text-white/60">{new Date(photo.shotAt).toLocaleDateString("en-US")}</p>}
  {photo.description && <p className="mt-4 text-sm leading-7 text-white/80">{photo.description}</p>}
</div>
```

### Step 4：右欄 — 區塊二：Interactions（按讚 + 留言合併）

建立 `src/components/gallery/interactions-panel.tsx`（可選，或直接在 page 內寫）：

```
Interactions header:
  ♡ {likeCount}  ·  💬 {comments.length}

LikeButton（緊湊版，見 Step 5）

<hr />

"Leave a comment"
<CommentForm />

<CommentList />
```

### Step 5：更新 `src/components/likes/like-button.tsx`

移除：
- 大字體 `text-3xl` 的按讚數數字顯示（數字改在 Interactions header 顯示）
- 說明文字段落（「你已經按過讚了...」）

改為緊湊版本：
- 一個 `<button type="submit">♡ Like / Unlike</button>`，搭配 loading state
- 維持 `useActionState` 邏輯不變

### Step 6：更新 `src/components/comments/comment-form.tsx`

樣式改為暗色系：
- input / textarea 的 `bg-white` 改為 `bg-white/8 border-white/15 text-white placeholder:text-white/40`
- `focus:border-stone-400` 改為 `focus:border-white/40`
- label 文字顏色改為 `text-white/70`

### Step 7：更新 `src/components/comments/comment-list.tsx`

- article 的 `bg-white/80 border-line text-stone-700` 改為 `bg-white/5 border-white/10 text-white/80`
- nickname `text-stone-900` 改為 `text-white`
- 日期 `text-stone-500` 改為 `text-white/45`
- 空狀態 `text-stone-600` 改為 `text-white/50`
- 日期格式改為 `toLocaleDateString("en-US")`

### Step 8：右欄 — 區塊三：EXIF Collapsible

建立一個簡單的 collapsible 元件（或用 `<details><summary>` HTML 原生方案，最簡單）：

```tsx
<details className="group border-t border-white/10 pt-4">
  <summary className="cursor-pointer text-sm text-white/60 hover:text-white/90 list-none flex items-center gap-2">
    <span className="transition group-open:rotate-90">▸</span>
    EXIF
  </summary>
  <div className="mt-3 grid gap-2 text-sm text-white/60">
    {exifFields.map(field => (
      <div key={field.label} className="flex justify-between">
        <span>{field.label}</span>
        <span className="text-white/80">{field.value}</span>
      </div>
    ))}
  </div>
</details>
```

若 exifFields 為空，整個 `<details>` 不渲染。

### Step 9：移除 Panel 元件從照片頁的使用

照片頁整個右欄不再使用 `<Panel>` 元件，改為直接的 `<div>` 搭配 border-b 分隔線。
`Panel` 元件本身保留（相簿頁還在用）。

### Step 10：更新 `src/components/ui/panel.tsx`（暗色主題支援）

`Panel` 目前的樣式 `bg-white/72 border-line` 在暗色主題下需要能響應 CSS token 變化：
- 把 `bg-white/72` 改為 `bg-panel`（使用 CSS token `--panel`）
- 把 `border-line` 已經是 token，不需要改

### 驗證
- 照片頁背景 #0c0c0c
- 右欄 3 個區塊清晰區分（基本資訊 / Interactions / EXIF）
- 按讚數字在 Interactions header 顯示（♡ N · 💬 N）
- EXIF 預設收合，點擊展開
- 留言表單與列表樣式為暗色

---

## Ticket UI-SLIDESHOW：幻燈片底部縮圖帶改版

**目標**：右側選片欄改為底部水平縮圖帶，可最小化為 dot indicator，加入 Framer Motion crossfade。

### 前置確認
- `src/components/gallery/slideshow-viewer.tsx`：249 行，需要大幅重構。
- 目前佈局：`lg:grid-cols-[1.2fr_0.8fr]`（左大圖 + 右欄含照片資訊和快速選片）

### Step 1：安裝 framer-motion

```bash
npm install framer-motion
```

### Step 2：建立 `src/components/gallery/film-strip.tsx`

獨立的 FilmStrip 元件，Props：
```ts
type FilmStripProps = {
  photos: GalleryPhoto[];
  currentIndex: number;
  onSelect: (index: number) => void;
};
```

內部 state：`isVisible: boolean`（預設 true）

結構：
```tsx
<div className="border-t border-white/10">
  {/* toggle button */}
  <button onClick={() => setIsVisible(v => !v)} className="...">
    {isVisible ? "⌄" : "⌃"}  {isVisible ? "" : "Show filmstrip"}
  </button>

  {/* thumbnails（CSS max-height transition） */}
  <div
    className="overflow-hidden transition-all duration-300"
    style={{ maxHeight: isVisible ? "120px" : 0 }}
  >
    <div className="flex gap-2 overflow-x-auto px-4 py-3" ref={stripRef}>
      {photos.map((photo, i) => (
        <button key={...} onClick={() => onSelect(i)} className={cn(
          "flex-none w-16 h-16 rounded-lg overflow-hidden border-2 transition",
          i === currentIndex ? "border-white" : "border-transparent opacity-50"
        )}>
          <PhotoStage photo={photo} />
        </button>
      ))}
    </div>
  </div>

  {/* dot indicator（isVisible=false 時顯示） */}
  {!isVisible && (
    <div className="flex justify-center gap-1 py-2">
      {photos.map((_, i) => (
        <span key={i} className={cn("w-1.5 h-1.5 rounded-full", i === currentIndex ? "bg-white" : "bg-white/30")} />
      ))}
    </div>
  )}
</div>
```

`scrollIntoView`：在 `currentIndex` 改變時，用 `ref` 找到對應縮圖並呼叫 `scrollIntoView({ behavior: 'smooth', inline: 'center' })`。

### Step 3：重構 `src/components/gallery/slideshow-viewer.tsx`

**移除**：
- 右側欄（`lg:grid-cols-[1.2fr_0.8fr]`）整個移除
- `<div className="grid min-h-0 gap-4">` 右側欄（照片資訊 + 快速選片）
- 照片資訊 Panel（顯示來源、拍攝日期、解析度、操作提示）
- 快速選片列表

**新增**：
- `import { AnimatePresence, motion } from "framer-motion"`
- 大圖區域改為 `motion.div` + `AnimatePresence` 做 crossfade：

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={currentIndex}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4 }}
    className="absolute inset-0"
  >
    <PhotoStage photo={currentPhoto} priority />
  </motion.div>
</AnimatePresence>
```

**新佈局**（改為 flex column）：
```
<div className="flex flex-col h-full">
  {/* HUD top bar */}
  <div className="flex items-center justify-between px-4 py-3">
    <button>✕ Close</button>
    <span>{currentIndex + 1} / {photos.length}</span>
    <div>[Play/Pause] [View Detail]</div>
  </div>

  {/* Photo area（flex-1） */}
  <div className="relative flex-1 overflow-hidden">
    <AnimatePresence mode="wait">
      <motion.div key={currentIndex} ...>
        <PhotoStage photo={currentPhoto} priority />
      </motion.div>
    </AnimatePresence>
    {/* Prev / Next arrows */}
    <button className="absolute left-4 top-1/2 -translate-y-1/2 ...">‹</button>
    <button className="absolute right-4 top-1/2 -translate-y-1/2 ...">›</button>
  </div>

  {/* Caption */}
  <div className="text-center py-3 text-sm text-white/70">
    {currentPhoto.title} · {currentPhoto.shotAt}
  </div>

  {/* FilmStrip */}
  <FilmStrip photos={photos} currentIndex={currentIndex} onSelect={setCurrentIndex} />
</div>
```

### Step 4：更新幻燈片的 trigger button

在照片詳情頁，「開啟幻燈片模式」按鈕改為英文 `Slideshow`，並移至 Header 右側（或頁面底部的 action row）。

### 驗證
- 幻燈片開啟後為純黑背景，全螢幕
- 照片切換有 Framer Motion opacity crossfade（0.4s）
- 底部縮圖帶預設展開
- 點 `⌄` 按鈕：縮圖帶收合（CSS max-height 動畫），顯示 dot indicator
- 點 `⌃` 按鈕：縮圖帶展開
- 切換照片時對應縮圖自動 scrollIntoView
- 鍵盤 ← → 空白 Esc 仍然正常運作

---

## 通用注意事項

### Panel 元件的暗色主題
`src/components/ui/panel.tsx` 目前樣式是 hardcode 的 `bg-white/72 border-line`。
`border-line` 已是 CSS token（`--line`），在暗色主題下會自動變 `rgba(255,255,255,0.10)`。
`bg-white/72` 不是 token，需要改為 `bg-panel`（使用 `--panel` token）讓 Panel 在暗色主題下有對應樣式。

### Tailwind CSS 4 的 token 使用方式
在 `globals.css` 中用 `@theme inline` 把 CSS variable 橋接為 Tailwind utility（已有範例）：
```css
@theme inline {
  --color-background: var(--background);
  --color-panel: var(--panel);
  --color-line: var(--line);
}
```
這樣 `bg-background`、`bg-panel`、`border-line` 才能在 class 中使用。
**dark theme 的 `[data-theme="dark"]` 會覆蓋 CSS variable，Tailwind utility 自動繼承，不需要 `dark:` prefix。**

### 不要動的部分
- `/admin` 和 `/admin/login` 的所有元件：本次不在範圍內
- Server Actions：資料層完全不動
- `src/lib/`：完全不動
- `src/types/`：完全不動
- `prisma/`：完全不動

### 每個 ticket 完成後
執行 `npm run build` 確認無 TypeScript 錯誤，再更新 `features.json` status 為 `done`。
