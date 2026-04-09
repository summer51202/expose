# Expose 資安審查報告

日期：2026-04-09
審查者：Codex
範圍：第一輪手動應用程式資安審查，重點放在認證、公開寫入路徑、上傳處理、機密資訊與執行時硬化。

## 審查範圍

本次審查的面向：
- 公開網站頁面與公開互動功能
- `/admin/login` 與 `/admin`
- 後台 Server Actions
- 留言與按讚 Server Actions
- 上傳流程與 Cloudflare R2 儲存整合
- Prisma schema 與 SQLite 使用方式
- Next.js 執行時設定與部署硬化

本次審查的檔案：
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
- `src/lib/comments/identity.ts`
- `src/lib/comments/repository.ts`
- `src/lib/likes/repository.ts`
- `src/lib/uploads/image-pipeline.ts`
- `src/lib/uploads/upload-service.ts`
- `src/lib/storage/r2-driver.ts`
- `next.config.ts`
- `prisma/schema.prisma`
- `.env.example`
- `docs/runbooks/launch-checklist.md`

## 部署假設

- 公開網站目前已正式上線。
- 後台功能暴露在 `/admin/login` 與 `/admin`。
- 驗證方式為單一共用的管理員帳號密碼，加上已簽名的 cookie session。
- 正式環境儲存預期使用 `STORAGE_BACKEND=r2`。
- 依照目前 Prisma datasource 與部署文件，正式環境資料庫可能仍使用 SQLite。
- 留言與按讚目前是公開可寫，不需要事先登入。

## 信任邊界

- 瀏覽器到公開網站：訪客輸入皆視為不可信任。
- 瀏覽器到 `/admin`：即使是管理員操作，進到伺服器端前仍應視為不可信任輸入。
- 公開表單到 Server Actions：屬於攻擊者可控制的輸入面。
- 應用伺服器到 SQLite：屬於可信任持久層，但若外洩會影響隱私與資料完整性。
- 應用伺服器到 Cloudflare R2：屬於需要 secret 保護的可信任儲存邊界。
- 環境變數到執行時：屬於最高敏感度的機密邊界。

## 嚴重度定義

- Critical：可繞過認證、機密外洩、任意檔案寫入、公開頁面儲存型 XSS。
- High：未授權可觸發 admin-only 動作、可暴力破解的後台入口、不安全上傳造成服務衝擊。
- Medium：容易被濫用的缺口、缺少硬化標頭、隱私洩漏、回傳過多內部錯誤細節。
- Low：可觀測性不足、非正式環境預設值偏弱、文件缺漏。

## Findings

### [HIGH] 唯一的管理員登入入口缺少暴力破解防護

受影響檔案：
- `src/app/admin/login/actions.ts:13`

證據：
- 登入成功與否只取決於共用帳號密碼比對。
- 登入失敗時會立即回傳錯誤，程式內沒有 cooldown、重試次數限制、rate limit、lockout 或登入失敗稽核紀錄。

相關程式位置：
- `src/app/admin/login/actions.ts:20`
- `src/app/admin/login/actions.ts:26`

影響：
- 由於目前網站採用單一共用管理員憑證，公開的 `/admin/login` 會成為完整後台權限的唯一入口。
- 攻擊者可以無限制地在線上嘗試猜密碼。
- 一旦成功登入，就能取得上傳、編輯相簿、刪除留言與清除按讚等完整管理權限。

建議：
- 在 `loginAction` 加入依 IP 與帳號維度的 rate limiting。
- 對連續失敗加入暫時鎖定或指數退避。
- 將重複失敗登入寫入管理者可見的記錄管道。
- 若網站持續公開營運，建議評估第二因素驗證或一次性驗證機制。

### [MEDIUM] 公開留言與按讚動作缺少濫用節流與自動化防護

受影響檔案：
- `src/app/photos/comment-actions.ts:15`
- `src/app/photos/like-actions.ts:14`

證據：
- 留言目前只有基本長度檢查就會接受。
- 按讚目前以長效 cookie 識別訪客。
- 這兩個 action 內都沒有 request throttling、驗證挑戰、CAPTCHA、cooldown、審核佇列或重複提交防護。

相關程式位置：
- `src/app/photos/comment-actions.ts:21`
- `src/app/photos/comment-actions.ts:65`
- `src/app/photos/like-actions.ts:28`
- `src/app/photos/like-actions.ts:48`

影響：
- 正式環境的公開寫入端點很容易被低成本濫用。
- 留言區可被垃圾訊息、辱罵內容或廣告灌爆。
- 按讚數可透過腳本加上 cookie 輪替或不同瀏覽器操作進行灌票。
- 這主要是可用性與資料可信度問題，即使不直接造成資料外洩，仍然會傷害正式站點品質。

建議：
- 對留言與按讚都加入基於 IP 或指紋的 rate limiting。
- 對留言加入 cooldown 與重複內容抑制。
- 評估留言是否應改為先審核後公開，或至少進入濫用審查流程。
- 若公開互動功能會持續保留，建議補上輕量級 bot friction。

### [MEDIUM] 上傳流程會把底層錯誤訊息直接顯示在後台 UI

受影響檔案：
- `src/app/admin/upload-actions.ts:36`
- `src/lib/storage/r2-driver.ts:141`

證據：
- 上傳 action 直接把 `error.message` 回傳給前端 UI。
- R2 driver 會拋出包含 HTTP 狀態碼與 response body 的詳細上游錯誤內容。

相關程式位置：
- `src/app/admin/upload-actions.ts:38`
- `src/lib/storage/r2-driver.ts:142`

影響：
- 一旦 admin session 被盜用，或有人能看到後台畫面，就可能直接取得儲存層細節、雲端服務回應與設定異常資訊。
- 這會增加資訊洩漏程度，也讓後續攻擊更容易。

建議：
- `uploadPhotosAction` 對使用者只回傳泛化錯誤訊息。
- 詳細錯誤僅保留在伺服器端日誌。
- 顯示在 UI 的操作訊息應避免直接包含 provider response body。

### [MEDIUM] 缺少基礎瀏覽器安全標頭，包含 CSP

受影響檔案：
- `next.config.ts:26`

證據：
- `next.config.ts` 目前有設定 image remote patterns 與 Server Action body size，但沒有設定任何安全標頭。
- 在 repo 中也找不到 `Content-Security-Policy`、`X-Frame-Options`、`Referrer-Policy`、`X-Content-Type-Options` 或 `Permissions-Policy`。

影響：
- 網站目前放棄了不少原本可以由瀏覽器幫忙執行的防護。
- 缺少 CSP 會降低未來出現 XSS 時的防禦縱深。
- 缺少 frame 與 content-type 硬化，會讓未來若引入不安全 render path 或內容型別混淆時，暴露面更大。

建議：
- 依照 Next.js 16 與目前資產來源加上基礎 CSP。
- 加上 `X-Content-Type-Options: nosniff`。
- 加上 `Referrer-Policy: strict-origin-when-cross-origin`。
- 透過 `frame-ancestors 'none'` 或 `X-Frame-Options: DENY` 禁止被嵌入。
- 加上限制型 `Permissions-Policy`。

### [MEDIUM] 留言指紋採用未加鹽、可穩定重現的網路識別雜湊

受影響檔案：
- `src/lib/comments/identity.ts:7`
- `prisma/schema.prisma:56`

證據：
- 留言識別值由 `x-forwarded-for`、`x-real-ip` 與 `user-agent` 組成。
- 目前使用的是純 SHA-256，沒有加入應用程式 secret 或可輪替的 salt。

相關程式位置：
- `src/lib/comments/identity.ts:9`
- `src/lib/comments/identity.ts:14`

影響：
- 若資料庫外洩，這個值會在多筆留言間保持穩定，可被拿來做跨留言關聯。
- 因為沒有 secret 保護，對常見輸入做離線猜測也相對容易。
- 這主要是隱私與資料最小化問題，不是直接的帳號接管風險。

建議：
- 改用帶有伺服器端 secret 的 HMAC，而不是純 SHA-256。
- 補上留言識別欄位的保留期限與刪除政策。
- 僅保留 moderation 或 abuse control 真正需要的最小資訊。

### [LOW] 上傳處理缺少明確的像素上限與 decompression bomb 防護

受影響檔案：
- `src/lib/uploads/image-pipeline.ts:42`
- `src/lib/uploads/upload-service.ts:39`
- `next.config.ts:31`

證據：
- 上傳流程目前有驗 MIME type 與檔案大小，但沒有明確限制最大像素尺寸，也沒有看到 `sharp` 輸入像素防護。
- Server Actions body size 目前允許到 `50mb`，而且每個檔案會進行多次轉檔與縮圖。

影響：
- 若管理員帳號被盜，或惡意管理員上傳高成本圖片，可能造成過高記憶體與 CPU 消耗。
- 由於這不是公開上傳端點，所以風險比匿名上傳低，但正式環境仍建議補齊硬化。

建議：
- 在完整處理前，先加上明確的圖片尺寸或像素數上限。
- 針對預期相機來源檔案大小，設定合適的 `sharp` 輸入安全限制。
- 對單次 request 可上傳的檔案數量加上上限。

## 正向觀察

- Admin page 與 admin server actions 都有在 mutation 邊界附近顯式呼叫 `requireAdminSession()`。
- Session cookie 有簽名，且使用 `httpOnly`、`sameSite: "lax"`，正式環境也會設 `secure`。
- 留言渲染是使用一般 React 文字輸出，沒有發現危險 HTML 注入路徑。
- 本次審查範圍內的 Prisma 使用沒有依賴 raw SQL。
- 上傳物件 key 由伺服器端產生，並不是直接採用攻擊者輸入的檔案路徑。

## 建議立即優先處理

1. 為 admin login 補上節流與鎖定機制。
2. 為公開留言與按讚補上 abuse controls。
3. 停止把底層錯誤直接回傳到 admin UI。
4. 補上基礎 security headers 與 CSP。

## 本次審查備註

- 這次是第一輪手動審查。
- 這一輪沒有做 live 環境瀏覽器驗證，也沒有做網路版 dependency/advisory 檢查。
- 下一輪建議直接對已部署環境驗證 runtime headers、cookie 行為與錯誤回傳內容。
