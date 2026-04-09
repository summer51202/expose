# Session Protocol — Long-Running Agent Loop

@AGENTS.md

每個 Coding Agent session **必須**遵守以下 7 步流程。這不是建議，是強制規則。

## Session 啟動（Step 1–4）

### Step 1: 讀取交班日誌

- 讀取 `.session/progress.md`，了解上一個 session 做了什麼、留下什麼問題
- 讀取 `git log --oneline -10`，了解最近的 commit 歷史

### Step 2: 讀取 Feature List，選擇目標

- 讀取 `.session/features.json`
- 從所有 phase 中挑選 **priority 最高**且 status 為 `in_progress` 或 `not_started` 的 feature
- **一個 session 只做一個 feature**，不要貪多

### Step 3: 環境初始化

- 執行 `.session/init.ps1`（或手動確認：npm install、prisma generate、.env 存在）
- 確認 `npm run build` 或 `npm run dev` 可正常執行

### Step 4: Smoke Test

- 確認 app 在開始改動前是健康的
- 如果 build 失敗，**先修復既有問題**，再開始新 feature

## Session 執行（Step 5–6）

### Step 5: 實作一個 Feature

- 只做 Step 2 選定的那一個 feature
- 遵守 `features.json` 中該 feature 的 `acceptance_criteria`
- 每完成一個有意義的里程碑就 commit（不要等到最後）
- Commit message 格式：`feat(P1-XXX): 簡短描述` 或 `fix(P1-XXX): 簡短描述`

### Step 6: 驗證

- 執行 `.session/verify.ps1 -Feature "P1-XXX"`
- 確認 lint、type check、build 全部通過
- 逐條檢查 `acceptance_criteria`，全部滿足才算完成
- 如果有 E2E 或手動測試需求，明確告知使用者

## Session 結束（Step 7）

### Step 7: 交班

- 更新 `.session/features.json`：將完成的 feature status 改為 `done`
- Git commit 所有變更（code 必須是**可以 merge 到 main**的狀態，不能有半成品）
- 更新 `.session/progress.md`，新增一筆 session 記錄，包含：
  - Session 編號（遞增）
  - 日期
  - 完成了什麼 feature
  - 當前 codebase 狀態
  - 遺留問題
  - 下一個 session 應做的事

## 關鍵原則

1. **Context Window = RAM，Filesystem = Disk** — 所有重要資訊寫在檔案裡，不要只存在 context 中
2. **每個 session 結束時 code 必須是 mergeable** — 沒有半成品、沒有 broken build
3. **一個 session 只做一個 feature** — 做完、驗證、交班，然後結束
4. **不要偷改 features.json 的結構** — 只能修改 `status` 和 `notes` 欄位
5. **交班日誌是給下一個 session 看的** — 寫清楚，不要省略
