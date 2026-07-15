# 月影祕律 Moonlit Arcana

《月影祕律》是一款原創四軌奇幻節奏遊戲。曲目星圖目前收錄 7 首正式歌曲與 28 張固定譜面；譜面和 MP3 音樂共用 `AudioContext.currentTime`，畫面掉幀不會累積時間誤差。

## 啟動

需要 Node.js 20.19 以上版本。

```powershell
npm install
npm run dev
```

開啟 Vite 顯示的本機網址。瀏覽器必須收到第一次按鍵或點擊後才能啟動音訊。

其他指令：

```powershell
npm test
npm run build
npm run preview
```

## 操作

| 功能 | 鍵盤 |
|---|---|
| 四軌符文 | `←` `↓` `↑` `→` 或 `D` `F` `J` `K` |
| 開始／確認 | `Space` 或 `Enter` |
| 暫停／繼續 | `P` 或 `Escape` |
| 暫停或結算時重玩 | `R` |

專家等級（Lv.4）的譜面會出現長按符文：按下軌道鍵後持續按住，直到尾端再放開。太早放開只拿部分分數，按住到尾端則依頭尾時間點取較嚴的判定。

觸控裝置可使用畫面下方四個按鈕，Pointer Events 允許雙指同時輸入。

## 目前曲庫

7 首歌曲皆由 tingyusaiart 創作，提供入門 Lv.1、學徒 Lv.2、熟練 Lv.3 與專家 Lv.4；進入選曲時預設為入門等級。

| 曲目 | 風格 | BPM | 調性 | 時長 | 音訊 |
|---|---|---:|---|---:|---|
| 月光齒輪巡遊 Moonlit Gear Parade | 奇幻小調 | 130 | D minor | 1:17 | `main-theme.mp3` |
| 搖擺嘉年華 Swing Carnival | 奇幻搖擺 | 111 | G major | 1:10 | `Swing_Carnival.mp3` |
| 雲端漫舞 Dancing on a Cloud | 夢幻舞曲 | 127 | A minor | 2:34 | `Dancing_on_a_Cloud.mp3` |
| 奇想貓帽遊行 Whimsical Parade Jazz | 奇想爵士進行曲 | 100 | C major | 1:35 | `Parade_of_Paws.mp3` |
| 奇想甜心 Whimsical Cute | 奇想甜心流行 | 122 | C major | 1:53 | `Whimsical_Cute.mp3` |
| 微縮世界 Miniature World | 微縮音樂盒 | 99.95 | A minor | 1:44 | `Miniature_World.mp3` |
| 霓虹幻影 Neon Mirage | 霓虹合成波 | 110 | G# minor | 2:22 | `Neon_Mirage.mp3` |

各曲各級的音符數：

| 曲目 | Lv.1 | Lv.2 | Lv.3 | Lv.4 |
|---|---:|---:|---:|---:|
| 月光齒輪巡遊 | 104 | 146 | 202 | 264 |
| 搖擺嘉年華 | 88 | 128 | 174 | 236 |
| 雲端漫舞 | 169 | 233 | 333 | 429 |
| 奇想貓帽遊行 | 111 | 159 | 231 | 307 |
| 奇想甜心 | 145 | 197 | 286 | 341 |
| 微縮世界 | 115 | 163 | 219 | 301 |
| 霓虹幻影 | 182 | 246 | 328 | 458 |

譜面由固定規則建立，每次遊玩完全相同。較低等級的音符會保留在下一級，再逐級加入切分、短填充與雙押。歌曲模組位於 `src/data/songs/`；六首 Suno 曲目共用 `src/rhythm/TapChartFactory.js` 的十二分拍網格產生器。

《微縮世界》實測速度為 99.95 BPM（非整數）：以 100 BPM 生成譜面時整曲會累積約 27 ms 偏移、逼近 Marvelous 判定窗（±30 ms），改用 99.95 後全曲最大偏移降到約 5 ms。

## 曲目星圖

選曲畫面的「曲目星圖」由 `src/data/songCatalog.js` 產生。每首可玩歌曲都有獨立 ID、音訊、歌曲資訊、難度與譜面；最佳紀錄依 `songId + difficultyId` 分開保存。

目前 7 首歌曲都可正式遊玩。切換曲目會同步更新歌曲資訊、難度與獨立紀錄，不會沿用上一首歌的音訊或譜面。

選曲清單只有桌機（981px 以上）限制高度並在清單內捲動；手機單欄版**不設高度上限**，清單直接展開、由頁面本身捲動。原因：觸控裝置不會顯示捲軸，清單一旦被裁切，超出的歌曲不會有任何提示，使用者永遠碰不到（2026-07 曾因此讓三首新歌在手機上完全無法選取）。`e2e_mobile` 會檢查沒有任何歌曲被裁切在清單外。

### 加入下一首歌曲

1. 把新 MP3 放進 `assets/music/`。
2. 在 `src/data/songs/` 新增歌曲模組，填入曲名、作者、BPM、首拍偏移、長度、音訊 URL、難度與譜面工廠。
3. 在 `src/data/songCatalog.js` 匯入歌曲，並加入 `SONG_CATALOG`。

歌曲模組使用靜態 `new URL('音樂相對路徑', import.meta.url).href`，讓 Vite 在正式建置時複製並雜湊音訊。切換歌曲時，遊戲會停止舊音源、清除舊解碼資料並套用新時間軸，但會保留 AudioContext、音量與其他設定。

## 判定

| 判定 | 時間差 | 分數權重 | 準確率權重 |
|---|---:|---:|---:|
| Marvelous | ±30 ms | 1000 | 100% |
| Perfect | ±55 ms | 900 | 95% |
| Great | ±90 ms | 700 | 75% |
| Good | ±140 ms | 400 | 45% |
| Miss | 超過 ±140 ms | 0 | 0% |

正值代表 Late，負值代表 Early。最終分數依整張譜面的最大分數正規化至 1,000,000。結算畫面會畫出整局命中偏移的分佈圖；HUD 的 EARLY／LATE 提示只在超出 Marvelous 窗（±30 ms）時出現，窗內一律顯示「正中拍點」。

總是偏早或偏晚時，用選單的「⏱ 自動量測延遲」：跟著 16 下節拍器點擊（前 4 下暖身），精靈取中位偏移直接寫入延遲校正——手機與藍牙耳機的輸出延遲動輒 100 ms 以上，自動量測比手動猜快得多。點得太散或太少會拒絕給建議，不會拿噪音當校正值。

長按符文只算一顆音符：頭部按下時先判定，尾端放開（或按住穿過尾端）時才結算，最終判定取頭尾兩者中較嚴的一級；太早放開視為斷開，只給 Good。

## 同步設計

- 音訊開始時間由 `AudioContext` 預先排程。
- MP3 只在第一次遊玩時載入並解碼為 `AudioBuffer`，後續重玩會重用已解碼音訊。
- 倒數直接比較音訊時鐘，不使用連續 `setTimeout`。
- 音符位置由 `hitTime - songTime` 每幀重新計算，不累加像素位移。
- 暫停時保存精確歌曲 offset 並停止 source。
- 恢復時建立新的 `AudioBufferSourceNode`，三秒倒數後從保存位置播放。
- 自動 Miss、輸入判定和畫面位置使用相同歌曲時間。

## 存檔

`localStorage` 保存音量、符文速度、降低動畫設定與最佳紀錄。讀取損壞 JSON 時會回復安全預設值，不會阻止遊戲啟動。

## 正式音樂

正式音樂位於 `assets/music/`：

```text
assets/music/main-theme.mp3
assets/music/Swing_Carnival.mp3
assets/music/Dancing_on_a_Cloud.mp3
assets/music/Parade_of_Paws.mp3
assets/music/Whimsical_Cute.mp3
assets/music/Miniature_World.mp3
assets/music/Neon_Mirage.mp3
```

每首歌曲皆依音樂分析結果設定自己的 BPM、首拍偏移與時長，並針對主要段落建立固定譜面。音樂檔載入或解碼失敗時，遊戲會回到選曲畫面並顯示錯誤，不會悄悄改播其他歌曲。

## 已知範圍

目前曲庫收錄 7 首可玩歌曲，全部具有 Lv.1–Lv.4，專家等級加入長按符文。延遲校正、新手教學（選單「如何遊玩」）與結算偏移分析圖皆已實作。完整自動延遲量測、長按尾端獨立評級與更豐富的教學關卡屬於後續階段。
