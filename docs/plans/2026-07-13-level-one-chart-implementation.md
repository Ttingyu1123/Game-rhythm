# Moonlit Gear Parade Lv.1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將〈Moonlit Gear Parade〉的預設譜面從 Lv.4 改為適合初次遊玩的 Lv.1。

**Architecture:** 保留歌曲中繼資料與 Web Audio 時鐘，只替換 `songs.js` 的固定譜面生成規則。用自動化測試限制音符數、最短間隔、節拍格線與雙押，再同步 UI 和 README。

**Tech Stack:** JavaScript ES modules, Node.js test runner, Vite, Playwright

---

### Task 1: 定義 Lv.1 譜面合約

**Files:**
- Modify: `tests/song-chart.test.js`

1. 將期望難度改為 `level === 1`。
2. 斷言音符數介於 95 與 115。
3. 斷言沒有任何同時音符。
4. 斷言最短時間差不小於 `60 / 130` 秒。
5. 斷言每顆音符位於四分音符格線，並且存在兩拍休息。
6. Run: `npm test -- tests/song-chart.test.js`
7. Expected: FAIL，因為現行譜面是 Lv.4、264 顆且含雙押。

### Task 2: 建立四分音符 Lv.1 譜面

**Files:**
- Modify: `src/data/songs.js`
- Test: `tests/song-chart.test.js`

1. 刪除半拍與雙押生成規則。
2. 使用九個固定段落：開場每兩拍一顆，主段每拍一顆並定期留白，結尾回到每兩拍一顆。
3. 回傳 `level: 1` 與 `scrollSpeed: 390`。
4. Run: `npm test -- tests/song-chart.test.js`
5. Expected: PASS。

### Task 3: 同步玩家看到的難度

**Files:**
- Modify: `index.html`
- Modify: `README.md`

1. 將選曲卡、遊戲 HUD 與結算畫面改為「入門 Lv.1」。
2. 將 README 難度與譜面說明改為 Lv.1、95–115 顆、無雙押。

### Task 4: 驗證與同步

**Files:**
- Modify: `D:/VibeCoding/Game-rhythm` 對應檔案

1. Run: `npm test`
2. Run: `npm run build`
3. 用 Playwright 驗證開始、首顆音符命中、暫停與觸控。
4. 將通過驗證的檔案複製至 `D:/VibeCoding/Game-rhythm`。
5. 在目標資料夾重跑 `npm test` 與 `npm run build`。

此專案沒有 Git repository，因此略過 commit 與 worktree 步驟。
