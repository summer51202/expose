# Expose 資安修補待辦清單

## Immediate

### SEC-001：保護 admin login 入口

- 在 `loginAction` 加入依 IP 與帳號的 rate limiting。
- 對連續失敗登入加入暫時鎖定或漸進式延遲。
- 將失敗登入事件記錄下來供後續檢視。
- 修補後重新驗證正常管理員登入體驗。

### SEC-002：為公開留言與按讚加入濫用防護

- 在 `createCommentAction` 加入 request throttling。
- 在 `togglePhotoLikeAction` 加入 request throttling 或重複操作抑制。
- 決定留言是否要改為即時公開，還是先進入審核流程。
- 補上垃圾訊息暴增時的操作處理指引。

### SEC-004：補上基礎瀏覽器安全標頭

- 依目前圖片來源與 Next.js 資產需求加上 CSP。
- 加上 `X-Content-Type-Options`、`Referrer-Policy`、frame protection 與 `Permissions-Policy`。
- 上線後用 live response check 驗證實際回傳標頭。

## Near-term

### SEC-003：停止將底層儲存錯誤暴露到 admin UI

- 調整 `uploadPhotosAction`，只回傳泛化的使用者錯誤訊息。
- 詳細 provider 錯誤只保留在伺服器端日誌。
- 順便檢查其他 server actions 是否也有直接回傳 `error.message`。

### SEC-005：替換留言識別雜湊方案

- 將留言識別值改為帶 secret 的 HMAC。
- 文件化這個識別欄位的隱私目的與保留期限。
- 確認刪除流程對應的 moderation 識別資料處理方式是否足夠。

### SEC-006：強化上傳資源邊界

- 加上明確的圖片尺寸與像素數上限。
- 對單次 request 的檔案數量設上限。
- 在進行高成本轉檔前就先對超限檔案 fail fast。

## Later Hardening

- 加上 admin session 事件記錄與操作稽核軌跡。
- 重新評估單一共用管理員帳密是否仍適合正式上線網站。
- 建立每月 dependency review 與定期 secret rotation checklist。
- 每次 release 後新增一份 live 資安 smoke checklist，覆蓋 headers、cookies 與 admin path 行為。
