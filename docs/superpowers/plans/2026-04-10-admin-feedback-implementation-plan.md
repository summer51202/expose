# 管理後台回饋改善實作計畫

> **給 agentic workers：** 必要子技能：請使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans，逐項任務實作本計畫。步驟使用 checkbox（`- [ ]`）語法追蹤。

**目標：** 將目前的使用者回饋待辦整理成分階段實作計畫，改善上傳安全性、相簿管理、管理後台可用性、留言回覆，以及相簿封面呈現。

**架構：** 先處理風險最高的營運流程：避免上傳到錯誤目的地，並讓上傳後的修正成為可能。接著強化上傳流程，將管理後台 UI 產品化到能支援真實任務，最後為相簿封面增加視覺打磨。實作需貼合目前 Next.js 16 + Server Actions + Prisma/manifest repository 的分層，不引入新的管理子系統。

**技術棧：** Next.js 16 App Router、React 19、TypeScript、Server Actions、Prisma + SQLite、manifest fallback repositories、Cloudflare R2、Tailwind CSS 4

---

## 範圍

本計畫涵蓋目前追蹤於以下文件的六項回饋：

- `docs/issue-tracker/user-feedback-backlog.md`

規劃交付順序：

1. 上傳目的地必須明確。
2. 管理員可在上傳後將照片重新指派到正確相簿。
3. 大批次上傳必須安全失敗或可靠完成。
4. 管理後台從原型導向調整為產品導向。
5. 管理員可用明確的站主顯示名稱回覆訪客留言。
6. 相簿封面可像 hero 區塊一樣輪播相簿圖片。

---

## 檔案地圖

### 可能會修改的既有檔案

- `src/components/admin/upload-form.tsx`
  - 上傳目的地 UX、用戶端驗證、批次 guardrails、進度/失敗訊息。
- `src/app/admin/upload-actions.ts`
  - 伺服器 action 對必要目的地的驗證，以及更安全的上傳錯誤處理。
- `src/lib/uploads/upload-service.ts`
  - 上傳批次、總大小檢查，以及不會卡住的失敗行為。
- `src/app/admin/page.tsx`
  - 管理後台資訊架構，以及相簿管理與留言回覆控制項的位置。
- `src/components/admin/album-editor-form.tsx`
  - 相簿 metadata 編輯可能會延伸加入管理入口。
- `src/lib/photos/repository.ts`
  - 在 Prisma 與 manifest 實作中加入照片重新指派能力。
- `src/lib/photos/queries.ts`
  - 支援管理介面的照片查詢/分組。
- `src/lib/albums/queries.ts`
  - 持續提供相簿選項，並可能提供加強版的相簿封面輪播資料。
- `src/components/admin/comment-moderation-list.tsx`
  - 從僅刪除的 moderation 擴充為 moderation + reply。
- `src/app/admin/engagement-actions.ts`
  - 新增站主回覆的 server action。
- `src/app/photos/comment-actions.ts`
  - 保持公開留言建立流程與站主回覆相容。
- `src/components/comments/comment-list.tsx`
  - 在訪客留言下方以不同樣式呈現站主回覆。
- `src/app/photos/[source]/[id]/page.tsx`
  - 提供留言 thread 資料並渲染更新後的留言 UI。
- `prisma/schema.prisma`
  - 若回覆以獨立 relation 或存在 `Comment` 中，新增回覆結構。

### 可能會新增的檔案

- `src/components/admin/photo-album-manager.tsx`
  - 用於將照片重新指派到相簿的管理 UI。
- `src/app/admin/photo-actions.ts`
  - 照片重新指派與批次移動的 server actions。
- `src/lib/comments/thread-types.ts`
  - 若現有 `CommentRecord` 不足，提供訪客留言 + 站主回覆的共享型別。
- `src/components/admin/comment-reply-form.tsx`
  - moderation 區域中的 inline 管理員回覆表單。
- `src/components/albums/album-cover-slideshow.tsx`
  - 可重用的相簿封面輪播 UI。

### 驗證介面

- `/admin`
- `/albums/[slug]`
- `/photos/[source]/[id]`
- `.session/verify.ps1`

---

## 開始寫程式前需要鎖定的決策

### 決策 1：上傳目的地維持必填

使用空白 placeholder 作為預設狀態。不要靜默 fallback 到「未分類」。

### 決策 2：相簿修正是照片重新指派，不是強迫重新上傳

透過更新已儲存資料中的照片與相簿關聯來修正錯誤上傳。不要要求使用者重新上傳同一批檔案。

### 決策 3：站主回覆使用單一固定公開顯示名稱

v1 使用一個設定好的站主/品牌顯示名稱。除非產品真的需要，否則不要引入多管理員身份。

建議的 v1 來源：

- 若可用，使用 `SITE_OWNER_NAME` env/config value；否則使用 site-config constant。

### 決策 4：相簿封面輪播保持輕量

偏好使用少量相簿圖片，搭配類似 hero 的 CSS/React timing 做輪播。不要為相簿卡片建立沉重的 client-only gallery 子系統。

---

## 任務 1：強制要求上傳目的地

**檔案：**
- 修改：`src/components/admin/upload-form.tsx`
- 修改：`src/app/admin/upload-actions.ts`
- 修改：`src/lib/uploads/upload-service.ts`

- [ ] **步驟 1：在伺服器路徑鎖定驗證規則**

實作缺少 `albumId` 時即為無效的規則，即使用戶端手動送出表單也一樣。

預期行為：

- `uploadPhotosAction` 拒絕空白目的地。
- `uploadPhotos` 拒絕 `albumId: null`。
- 錯誤文案清楚說明必須選擇相簿。

- [ ] **步驟 2：讓用戶端表單對齊伺服器規則**

更新上傳表單，使 placeholder 預設保持選取，並且送出按鈕在以下條件成立前維持 disabled：

- 已選擇至少一個檔案
- 已選擇有效相簿

UI 需求：

- 可見的 placeholder 文字，例如 `請選擇上傳相簿`
- select 控制項附近有 inline 驗證訊息
- 目的地缺失時不可出現誤導性的成功路徑

- [ ] **步驟 3：保持現有表單可存取性**

確保 disabled/enabled 狀態可理解：

- 保留 label + select 語意
- 保持鍵盤送出行為正確
- 不要只用顏色隱藏驗證規則

- [ ] **步驟 4：手動驗證流程**

檢查：

- 未選相簿時 UI 會阻止送出
- 強制送出且未選相簿時 server action 仍會失敗
- 有效相簿 + 檔案仍可正常上傳

執行：

```powershell
npm run build
```

預期：

- build 成功
- 上傳表單編譯時沒有型別問題

---

## 任務 2：新增上傳後相簿重新指派

**檔案：**
- 新增：`src/components/admin/photo-album-manager.tsx`
- 新增：`src/app/admin/photo-actions.ts`
- 修改：`src/app/admin/page.tsx`
- 修改：`src/lib/photos/repository.ts`
- 修改：`src/lib/photos/queries.ts`
- 修改：`src/types/photo.ts`

- [ ] **步驟 1：擴充 repository contract**

新增方法：

- 將單張照片移到另一個相簿
- 將多張照片移到另一個相簿
- 列出最近上傳的照片，並附上適合管理編輯的相簿 metadata

兩條 repository 路徑都必須可用：

- Prisma-backed uploaded photos
- manifest-backed uploaded photos

- [ ] **步驟 2：新增重新指派用的管理員 server actions**

建立 actions，需：

- 要求 admin session
- 驗證來源照片 id 與目的相簿 id
- 透過 repository 更新資料
- revalidate `/admin`、`/`、`/albums/[slug]` 與受影響的照片頁

- [ ] **步驟 3：新增修正用管理 UI**

在 `/admin` 渲染照片管理區塊，包含：

- 最近上傳的照片
- 目前相簿標籤
- 目的相簿 selector
- 單張照片移動 action

若第一版 UI 支援批次移動，請包含：

- row selection
- 一個目的地 selector
- 一個批次送出 action

若批次移動風險過高，先交付單張照片重新指派，並在同 feature 內留下批次移動 follow-up subtask。

- [ ] **步驟 4：保留目前相簿 metadata 編輯**

不要讓以下功能 regression：

- 相簿名稱更新
- 相簿描述更新
- 相簿列表渲染

- [ ] **步驟 5：端到端驗證相簿重新指派**

檢查：

- 照片可在管理後台從錯誤相簿移到正確相簿
- 相簿數量更新
- 公開相簿頁反映新的歸屬
- 照片詳情頁仍可載入

執行：

```powershell
npm run build
```

預期：

- build 成功
- 沒有壞掉的 admin imports 或 repository types

---

## 任務 3：強化大批次上傳行為

**檔案：**
- 修改：`src/lib/uploads/upload-service.ts`
- 修改：`src/app/admin/upload-actions.ts`
- 修改：`src/components/admin/upload-form.tsx`
- 視需要修改：`next.config.ts`

- [ ] **步驟 1：定義明確的上傳 guardrails**

設定並記錄 v1 限制：

- 每批最大檔案數：100 張
- 每次送出的 payload 總大小上限：200MB
- 單檔大小限制：20MB

建議方向：

- 保留單檔限制
- 新增總大小限制
- 新增檔案數限制，但設定為符合實際使用習慣的高上限，讓 50-100 張照片可一次選取

- [ ] **步驟 2：在昂貴圖片處理前提早失敗**

在 `upload-service` 驗證：

- 檔案數
- 總 bytes
- 支援的 MIME types
- 空檔案過濾

在呼叫 Sharp/image processing 前回傳可行動的錯誤訊息。

- [ ] **步驟 3：降低全有或全無行為**

選擇其一：

- 依序處理，並提供 progress-safe reporting
- 小型內部批次，搭配每批 persistence

建議的 v1 作法：

- 依序處理或小批次處理
- 遇到第一個 fatal error 時停止
- 回傳訊息指出失敗前已完成多少檔案

- [ ] **步驟 4：改善管理員回饋**

更新表單文案，讓使用者看到：

- 允許的檔案類型
- 檔案數限制
- 總大小限制
- 不需重新整理瀏覽器即可看到錯誤訊息

- [ ] **步驟 5：重新檢查平台限制**

確認 `next.config.ts` 中的 `serverActions.bodySizeLimit` 是否仍符合新增 guardrails 後的目標上傳體驗。

- [ ] **步驟 6：用真實批次驗證**

手動驗證目標：

- 小型有效批次可成功上傳
- 總大小超限的批次會以清楚訊息失敗
- 單檔超限會以清楚訊息失敗
- 失敗後頁面仍可互動

執行：

```powershell
npm run build
```

預期：

- build 成功
- 沒有 runtime-only assumptions 洩漏到 client component

---

## 任務 4：將管理後台產品化

**檔案：**
- 修改：`src/app/admin/page.tsx`
- 修改：`src/components/admin/upload-form.tsx`
- 修改：`src/components/admin/album-editor-form.tsx`
- 修改：`src/components/admin/comment-moderation-list.tsx`
- 修改：`src/components/admin/like-summary-list.tsx`

- [ ] **步驟 1：盤點並移除原型語氣**

將偏解釋/偏 mockup 的文案替換成任務導向 UI 文案。

目標語氣：

- 簡潔
- 面向操作者
- 像正式產品

- [ ] **步驟 2：圍繞真實任務重整頁面**

建議的頂層區塊：

- 上傳照片
- 管理照片/相簿
- 管理留言
- 查看互動

若階段標籤讀起來像內部 roadmap，而不是管理介面，請避免使用。

- [ ] **步驟 3：改善可掃讀性**

減少冗長描述段落，偏好：

- 短輔助說明
- 更清楚的 action labels
- 分組控制項

- [ ] **步驟 4：保留目前功能**

不要破壞：

- logout
- 相簿編輯
- 上傳入口
- 留言 moderation
- 清除 likes

- [ ] **步驟 5：驗證後台讀起來像正式產品 UI**

手動檢查：

- 除非刻意保留，否則不應出現「local dev」、「phase」或教程式重文案
- 首屏 action 可在 10 秒內理解

執行：

```powershell
npm run build
```

預期：

- admin page 可編譯並以更新後的結構渲染

---

## 任務 5：為訪客留言新增站主回覆

**檔案：**
- 修改：`prisma/schema.prisma`
- 修改：`src/lib/comments/repository.ts`
- 修改：`src/lib/comments/queries.ts`
- 修改：`src/app/admin/engagement-actions.ts`
- 修改：`src/components/admin/comment-moderation-list.tsx`
- 修改：`src/components/comments/comment-list.tsx`
- 修改：`src/app/photos/[source]/[id]/page.tsx`
- 新增：`src/components/admin/comment-reply-form.tsx`
- 視需要新增：`src/types/comment-thread.ts`
- 視需要修改：`src/config/site.ts`

- [ ] **步驟 1：選擇回覆資料模型**

建議的 v1 形狀：

- 保留訪客留言作為主要公開項目
- 每則訪客留言最多附上一則站主回覆

可實作為：

- `Comment` 上的額外欄位，或
- 獨立的 reply relation/table

偏好能讓公開渲染與管理員撰寫保持簡單的選項。

- [ ] **步驟 2：定義回覆者身份**

公開顯示一個站主 label，例如：

- 網站主理人名稱
- 工作室名稱
- 品牌名稱

除非產品明確需要，否則不要從 admin login username 推導公開回覆 label。

- [ ] **步驟 3：實作 repository/query 支援**

新增方法：

- 建立站主回覆
- 取得包含可選站主回覆的留言
- 保留刪除留言行為

若刪除 parent comment 也應刪除站主回覆，請在資料模型與 query layer 中明確處理。

- [ ] **步驟 4：新增管理員回覆 UI**

在管理留言區，每則留言應支援：

- 若已有站主回覆，顯示該回覆
- 若尚無回覆，輸入一則回覆
- 編輯/移除回覆可留待後續 pass

v1 若為了控制 scope，reply-once 是可接受的。

- [ ] **步驟 5：公開渲染回覆**

在公開照片頁：

- 將站主回覆嵌套或視覺連結於訪客留言下方
- 使用清楚的站主 badge/name
- 讓訪客暱稱與站主回覆樣式有所區別

- [ ] **步驟 6：驗證留言 thread 流程**

檢查：

- 訪客留下留言
- 管理員在後台看到留言
- 管理員回覆
- 公開頁以設定好的站主身份顯示回覆

執行：

```powershell
npm run build
```

預期：

- schema/types 對齊
- comment list 渲染時沒有 thread shape mismatch

---

## 任務 6：新增相簿封面隨機輪播

**檔案：**
- 新增：`src/components/albums/album-cover-slideshow.tsx`
- 修改：`src/lib/albums/queries.ts`
- 修改：`src/app/(browse)/page.tsx`
- 修改：`src/app/albums/[slug]/page.tsx`
- 修改任何目前渲染靜態封面圖的 album card/list component

- [ ] **步驟 1：決定輪播位置**

建議的 v1 推出方式：

- 從相簿卡片或相簿 strip 封面區域開始
- 若第一個位置表現良好，再延伸到相簿詳情 header

- [ ] **步驟 2：準備相簿圖片資料**

更新 album queries，使每個相簿回傳一小組候選圖片 URL，而不只是單一封面。

控制資料 payload：

- 使用 medium 或 thumbnail URLs
- 每個相簿限制少量圖片

- [ ] **步驟 3：建立輕量輪播元件**

在適合的地方重用 hero 的互動風格：

- 定時輪替
- 細緻 crossfade
- 只有一張圖時 fallback 到單圖

避免新增 repo 目前未使用的沉重動畫 dependency。

- [ ] **步驟 4：整合時避免 layout regression**

確保：

- desktop 與 mobile layout 仍可運作
- 圖片高度變化不會造成 layout shift
- 相簿頁仍保持快速

- [ ] **步驟 5：驗證視覺一致性**

手動檢查：

- 輪播感覺與 hero 有關聯，但不會尷尬地重複
- 照片較少的相簿仍可良好渲染
- 相簿缺少足夠素材時不會出現破圖

執行：

```powershell
npm run build
```

預期：

- build 成功
- slideshow component 不破壞 SSR/hydration 邊界

---

## 建議里程碑

### 里程碑 1：上傳安全基線

- 任務 1：強制要求上傳目的地
- 任務 2：新增上傳後相簿重新指派

發布價值：

- 避免常見錯誤
- 給管理員立即復原路徑

### 里程碑 2：上傳可靠性

- 任務 3：強化大批次上傳行為

發布價值：

- 降低 crash 與必須重新整理才能恢復的失敗

### 里程碑 3：管理後台產品化

- 任務 4：將管理後台產品化
- 任務 5：為訪客留言新增站主回覆

發布價值：

- 讓後台感覺接近 production-ready
- 啟用站主與訪客互動

### 里程碑 4：視覺打磨

- 任務 6：新增相簿封面隨機輪播

發布價值：

- 改善相簿預覽品質與網站識別感

---

## 驗證清單

- [ ] 上傳表單在 client 與 server 路徑都會阻止缺少目的地
- [ ] 管理員可將錯誤上傳的照片移到另一個相簿
- [ ] 超大上傳批次會失敗且不會卡住頁面
- [ ] 管理後台文案與 layout 感覺是產品導向
- [ ] 管理員可用單一明確站主顯示名稱回覆訪客留言
- [ ] 公開照片頁正確顯示站主回覆
- [ ] 相簿封面輪播使用相簿自己的圖片並能 graceful degrade
- [ ] 每個里程碑後 `npm run build` 成功
- [ ] 宣稱完成前 `.session/verify.ps1` 通過

---

## 執行注意事項

- 記得保持 repository parity：此 codebase 的部分 repositories 仍同時支援 Prisma-backed 與 manifest-backed 路徑。
- v1 不要過度建置多管理員回覆身份。
- 若批次移動開始威脅 scope，偏好先交付單張照片相簿重新指派。
- 若 upload batching 需要超出目前 server actions 的架構變更，請把該工作拆到里程碑 checkpoint 後，而不是硬塞進一個巨大 patch。
