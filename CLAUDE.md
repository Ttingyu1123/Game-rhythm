# CLAUDE.md

《月影祕律 Moonlit Arcana》— 原創四軌奇幻節奏遊戲。Vite + 原生 JavaScript（無框架、無 runtime 依賴），Canvas 渲染，Web Audio 時鐘同步。原始開發者為 Codex，設計/實作紀錄在 `docs/plans/`。

## 指令

```powershell
npm run dev      # Vite dev server（瀏覽器需先有按鍵/點擊才能啟動音訊）
npm test         # node --test（60 個單元測試，不需瀏覽器）
npm run build    # 產出 dist/（MP3 會被 Vite 雜湊複製）
npm run preview  # 預覽 production build
```

需 Node.js ≥ 20.19。`tests/e2e_*.py` 是 Playwright Python 煙霧測試，需另行啟 dev server 後手動跑。

## 架構

進入點 `index.html` → `src/main.js` → `src/core/Game.js`（主迴圈與狀態機）。

| 目錄 | 職責 |
|---|---|
| `src/audio/` | AudioEngine（AudioContext 管理）、AudioFileLoader（MP3 解碼快取）、AudioTimeline（歌曲時間軸）、SynthSong（合成音源） |
| `src/rhythm/` | JudgmentSystem（判定窗）、TapChartFactory（十二分拍網格譜面產生器）、ChartValidator、SessionStats |
| `src/data/songs/` | 每首歌一個模組：曲名、BPM、首拍偏移、音訊 URL、四級譜面工廠 |
| `src/data/songCatalog.js` | 曲庫正本——新歌在此註冊 |
| `src/rendering/` | CanvasRenderer + 純函式 renderMath（可單測） |
| `src/ui/AppUI.js` | DOM 選單/HUD；`src/input/InputManager.js` 鍵盤+Pointer Events |
| `src/storage/SaveStore.js` | localStorage：音量、符文速度、最佳紀錄（依 songId+difficultyId 分開存） |

## 不可破壞的同步設計（改動 audio/rhythm 前必讀）

- **單一時間源**：譜面與 MP3 共用 `AudioContext.currentTime`。倒數、自動 Miss、輸入判定、音符位置全部從同一個歌曲時間推導。
- 音符位置每幀由 `hitTime - songTime` 重算，**絕不**累加像素位移；掉幀不會累積誤差。
- 暫停＝記下精確 offset + 停掉 source；恢復＝新建 `AudioBufferSourceNode` 從 offset 排程播放。
- 譜面是固定規則產生的確定性資料——同曲同級每次完全相同。低級音符保留到高級，逐級加料。
- 判定窗（ms）：Marvelous ±30 / Perfect ±55 / Great ±90 / Good ±140；分數正規化至 1,000,000。改判定常數要同步改 `tests/judgment-system.test.js`。

## 加一首新歌

1. MP3 放 `assets/music/`（歌曲模組用 `new URL('...', import.meta.url).href` 引用，讓 Vite 雜湊複製）。
2. `src/data/songs/` 新增模組（照 `swingCarnival.js`），填 BPM、首拍偏移、時長、譜面工廠。
3. `src/data/songCatalog.js` 匯入並加進 `SONG_CATALOG`。
4. `npm test`——`song-catalog` / `new-song-charts` 測試會驗證譜面合法性。

## 部署

GitHub Pages（Actions workflow `.github/workflows/deploy.yml`：push main → build → deploy dist）。
正式網址 `https://game-rhythm.tingyudeco.com`（Cloudflare CNAME `game-rhythm` → `ttingyu1123.github.io`，DNS only 灰雲）。
`public/CNAME` 讓自訂網域設定跟著 artifact 走。

## 慣例

- 錯誤不吞：音樂載入/解碼失敗回選曲畫面顯示錯誤；localStorage 壞 JSON 回安全預設值。
- 測試跑在 Node（`node --test`），渲染邏輯抽成純函式測——新邏輯照此模式，不要引入需要瀏覽器的單測。
- 中文為主要文案語言（zh-TW），README 是玩家/曲庫文件正本，改曲庫要同步更新 README 的表格。
