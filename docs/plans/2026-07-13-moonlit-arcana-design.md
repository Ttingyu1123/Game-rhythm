# 《月影祕律》同步 MVP 設計

## 目標

建立一款可在桌面與橫向觸控裝置遊玩的四軌節奏遊戲。第一版使用程式生成的 128 BPM、D 小調奇幻測試曲，優先證明音訊、譜面和輸入判定長時間同步。正式 Suno 音樂之後只需新增音訊檔、更新曲目資料與人工譜面，不需改寫遊戲核心。

## 產品範圍

MVP 包含主選單、單曲資訊、三秒倒數、四軌落下音符、方向鍵及 D/F/J/K、基本觸控、Marvelous/Perfect/Great/Good/Miss、Early/Late、Combo、正規化分數、準確率、Groove、暫停續玩、重新開始、結算與本機最佳紀錄。第一版只支援 tap 與雙押；多曲目、多難度、長按、教學、完整校正流程及詳細偏移圖列入後續工作。

## 視覺方向

主題為「月光魔法祭」。深靛天空作為主色，月紫表示魔力，星金表示精準命中，青綠表示節奏能量。四軌使用不同箭頭、邊框紋理與符文，不只依靠顏色。判定線是一道魔法陣，音符抵達時像符文被吸入法陣。背景包含星塵、遠方尖塔與隨拍脈動的月輪，但限制粒子數量，並尊重 `prefers-reduced-motion`。

## 架構

Vite 只負責開發伺服器與建置。遊戲使用原生 ES modules、Canvas 2D 與 Web Audio API。純邏輯模組不依賴 DOM，方便使用 Node 內建測試工具進行 TDD。

- `AudioEngine` 建立唯一的 `AudioContext`、程式音訊 Buffer、音量節點與可重建的 `AudioBufferSourceNode`。
- `Game` 管理 menu、countdown、playing、paused、result 狀態與單一 `requestAnimationFrame` 迴圈。
- `JudgmentSystem` 只處理候選搜尋及時間差判定。
- `SessionStats` 只處理分數、Combo、準確率、Gauge 與評級。
- `CanvasRenderer` 根據 song time 計算音符位置，不累加像素位移。
- `InputManager` 將鍵盤與 pointer 輸入正規化成 lane press/release 事件。
- `SaveStore` 包裝 localStorage、版本和損壞資料復原。

## 同步模型

音樂播放前，`AudioEngine` 先排定 `source.start(contextStartTime, songOffset)`。播放時間為 `songOffset + AudioContext.currentTime - contextStartTime`。倒數直接比較 `AudioContext.currentTime` 與 `contextStartTime`，不使用多個 `setTimeout`。音符位置使用 `hitLineY - (note.time - songTime) * pixelsPerSecond`。掉幀後下一幀會立即回到正確位置。

暫停時停止目前 source 並保存精確 song offset。恢復時建立新的 source，排定三秒後由該 offset 開始。倒數期間譜面保持不動；source 真正開始後才重新允許判定。`AudioBufferSourceNode` 不會重複 start，也不會殘留重疊音訊。

## 譜面與判定

曲目資料包含 id、標題、BPM、時長、音訊類型、scroll speed 及 notes。每顆 note 有唯一 id、秒數、lane 與 type。載入時驗證排序、範圍、lane、type 及同軌重複音符。

輸入時只檢查同軌未判定音符，選擇絕對時間差最小且落在最大判定窗內的候選。自動 Miss 只處理超過 Good 視窗的未判定音符。雙押是兩個相同時間、不同 lane 的獨立 note，因此一次輸入不會刪除另一軌。

## 錯誤與復原

AudioContext 或音訊 Buffer 建立失敗時返回選單並顯示可讀訊息。頁面失焦時安全暫停。重玩與返回選單會停止音源、清理輸入狀態並取消舊的動畫工作。localStorage 解析失敗時保留損壞備份字串並回到預設資料，不阻止遊戲啟動。

## 驗證

自動測試覆蓋譜面驗證、最接近候選、判定窗邊界、雙押互不干擾、自動 Miss、正規化分數、準確率、Combo、Gauge、評級及損壞存檔復原。建置後使用瀏覽器驗證首次互動啟動音訊、倒數、方向輸入、暫停恢復、重新開始、結算、觸控與 console。正式音樂加入前，程式曲和譜面共用同一個 BPM 格線。
