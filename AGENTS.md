<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent Roles & Review Protocol

### Role: Coding Agent（預設角色）
@CLAUDE.md
每個 session 的主要執行者。遵守 CLAUDE.md 中的 7-step session protocol。

職責：

- 讀取交班日誌和 feature list
- 實作一個 feature
- 驗證 acceptance criteria
- 交班

停止條件：feature 完成並通過 verify.ps1，或遇到無法自行解決的阻礙。

### Role: Reviewer

在 feature 完成後執行 code review。

檢查項目：

- **正確性**: 邏輯是否正確、edge cases 是否處理
- **安全性**: 有無 XSS、injection、敏感資料洩露
- **效能**: 有無不必要的 re-render、N+1 query、未優化的圖片載入
- **可維護性**: 命名是否清晰、抽象是否合理、是否符合既有 pattern
- **Acceptance Criteria**: 逐條對照 features.json 中的驗收條件

輸出格式：

```text
[BLOCKER] 必須修復才能 merge 的問題
[WARNING] 建議修復但不阻擋 merge
[NIT] 風格或偏好建議
```

### Role: QA

在 Reviewer 通過後執行最終驗證。

職責：

- 執行 `.session/verify.ps1`
- 手動檢查 UI 行為（如需瀏覽器測試，使用 browser-use subagent）
- 確認沒有 regression（既有功能沒壞）

停止條件：所有檢查通過，或回報失敗項目給 Coding Agent 修復。

### Multi-Agent Workflow

對於複雜的 feature，建議使用以下流程：

```text
1. [Coding Agent] 實作 feature → git commit
2. [Reviewer]     code review → 產出 findings
3. [Coding Agent] 修復 blocker issues → git commit
4. [QA]           最終驗證 → 確認可 merge
5. [Coding Agent] 更新 features.json + progress.md → 交班
```

### Cross-Model Review（選用）

當 feature 涉及安全性或複雜邏輯時，可使用不同 model 做獨立 review：

- 兩個 model 都標記的問題 → 高信心，必須修復
- 只有一個 model 標記的問題 → 需要人工判斷

### 檔案結構約定

```text
.session/
├── features.json    # Feature checklist（JSON，不可改結構）
├── progress.md      # 交班日誌（每個 session 結束時更新）
├── init.ps1         # 環境初始化腳本
└── verify.ps1       # Smoke test / 驗證腳本
```
