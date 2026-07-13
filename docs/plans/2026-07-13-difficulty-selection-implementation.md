# Difficulty Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 為〈Moonlit Gear Parade〉加入可在選曲畫面切換的 Lv.1–Lv.4 譜面，並分開保存每級紀錄。

**Architecture:** `songs.js` 對外提供難度資料與 `createChart(level)`。`Game` 管理目前難度，`AppUI` 只負責同步 DOM 與 ARIA 狀態；存檔鍵使用難度 ID。

**Tech Stack:** JavaScript ES modules, HTML, CSS, Node.js test runner, Vite, Playwright

---

### Task 1: 用測試定義四張譜面

**Files:**
- Modify: `tests/song-chart.test.js`
- Modify: `src/data/songs.js`

1. 先將測試改為讀取 `MOONLIT_GEAR_PARADE.difficulties` 和 `createChart(level)`。
2. 斷言等級為 1–4、Lv.1 為預設、音符數嚴格遞增。
3. 斷言 Lv.1/Lv.2 零雙押、Lv.3 六組雙押、Lv.4 至少十五組雙押。
4. 為每張譜驗證確定性、ChartValidator、格線、時長與數量區間。
5. Run: `npm test -- tests/song-chart.test.js`
6. Expected: FAIL，因為現行只能建立 Lv.1。
7. 實作四個難度的段落規則與資料。
8. 重跑聚焦測試，Expected: PASS。

### Task 2: 防止難度按鈕觸發全域開局

**Files:**
- Modify: `tests/input-mapping.test.js`
- Modify: `src/input/InputManager.js`

1. 新增失敗測試：Space/Enter 來自 button、input、select 時不呼叫 `onConfirm`。
2. Run: `npm test -- tests/input-mapping.test.js`
3. Expected: FAIL，因為目前所有 Space/Enter 都會確認。
4. 加入焦點控件判斷，保留文件背景的開局捷徑。
5. 重跑聚焦測試，Expected: PASS。

### Task 3: 連接難度狀態與獨立紀錄

**Files:**
- Modify: `src/core/Game.js`
- Modify: `src/ui/AppUI.js`

1. `Game` 預設選擇 Lv.1，並綁定 `[data-difficulty-level]` 按鈕。
2. 切換時更新 UI 與當前等級的本機紀錄。
3. 開局以選中 level 產生譜面。
4. 結算時以選中 difficulty ID 讀寫紀錄。
5. `AppUI.updateDifficulty()` 更新按鈕、描述、選曲、HUD、結算與紀錄標籤。

### Task 4: 建立月光符文選擇器

**Files:**
- Modify: `index.html`
- Modify: `src/styles/main.css`
- Modify: `README.md`

1. 在歌曲資訊下方新增 2×2 難度按鈕與動態描述。
2. 使用金色邊框、紫羅蘭光暈、符文角標和輕微位移呈現選中狀態。
3. 在 980px 與760px media queries 保持可讀的按鈕寬度。
4. README 列出四級差異與獨立紀錄。

### Task 5: E2E、建置與同步

**Files:**
- Modify: `tests/e2e_smoke.py`
- Modify: `tests/e2e_mobile.py`
- Copy: validated files to `D:/VibeCoding/Game-rhythm`

1. E2E 斷言四顆按鈕、Lv.1 預設、切換 Lv.2 後的描述與 HUD。
2. 用 Lv.2 開局，命中首顆音符，完成暫停、續播、結算與獨立存檔驗證。
3. Run: `npm test`
4. Run: `npm run build`
5. 執行桌機與手機 Playwright E2E，檢查 console/page errors 為 0。
6. 同步至目標資料夾後，重跑測試、建置與目前 5191 網址驗證。

此專案沒有 Git repository，因此略過 worktree、commit 與 PR 步驟。
