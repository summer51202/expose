# Expose 資安風險登錄表

| ID | 嚴重度 | 標題 | 受影響資產 | 證據 | 建議負責人 | 目標時程 |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | High | Admin login 缺少暴力破解防護 | `/admin/login`、admin session 邊界 | `src/app/admin/login/actions.ts:13-27` | App/Auth | Immediate |
| SEC-002 | Medium | 公開留言與按讚缺少濫用節流 | 公開照片互動功能 | `src/app/photos/comment-actions.ts:15-70`、`src/app/photos/like-actions.ts:14-53` | App/Product | Immediate |
| SEC-003 | Medium | 上傳流程暴露底層錯誤細節 | 後台上傳 UI、R2 整合 | `src/app/admin/upload-actions.ts:24-39`、`src/lib/storage/r2-driver.ts:121-143` | App/Storage | Near-term |
| SEC-004 | Medium | 缺少基礎 security headers 與 CSP | 整個網站應用程式 | `next.config.ts:26-37` | App/Platform | Immediate |
| SEC-005 | Medium | 留言識別雜湊為可穩定重現且未加鹽 | 留言隱私資料 | `src/lib/comments/identity.ts:7-14`、`prisma/schema.prisma:50-58` | App/Data | Near-term |
| SEC-006 | Low | 上傳流程缺少明確像素安全上限 | 後台上傳處理流程 | `src/lib/uploads/image-pipeline.ts:36-74`、`src/lib/uploads/upload-service.ts:39-72` | App/Storage | Near-term |
