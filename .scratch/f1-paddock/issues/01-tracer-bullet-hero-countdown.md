# 01 — 曳光彈：地基、快照、View Model、Hero 倒數

**What to build:** 打開網站就能看到指向 Next Session 的倒數：距離下一節還有多久、那一節叫什麼、以及時間是換算成哪個時區的。

這張票的價值不在畫面，而在**它把整條管線打通**：抓取腳本從 Jolpica 的 `/current/` 取得資料 → 正規化成 Snapshot → 純函式 View Model 依「注入的現在時間」推導出 Next Session → 畫面呈現。同時建立本專案唯一的主要測試接縫。

**Hero 刻意不做視覺**——只求正確。樣式一律從簡，全部留給票 02。這讓這張票可控，也讓 02 的視覺檢查點純粹。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 抓取腳本使用 `/current/` 端點，**程式中任何地方都不得出現寫死的年份**
- [ ] Snapshot 以 `season` 為索引鍵組織，含賽程、各 Race Weekend 的 Session 清單與雙積分榜
- [ ] View Model 是純函式，「現在時間」為顯式參數而非讀取系統時鐘
- [ ] Next Session 推導正確：一般週末、Sprint Weekend、某節進行中、當日最後一節結束後跨到隔天、正賽後跨到下一個 Round
- [ ] Session 狀態能區分已結束／進行中／未開始（Session 無結束時間，以各節慣例時長推導，該常數需可見且附註理由）
- [ ] 倒數每秒更新，且在節次進行中顯示「進行中」而非負數
- [ ] 時區由瀏覽器偵測，畫面明確標示時區名稱與偏移
- [ ] 測試以錄製的真實 API fixtures 驅動，**測試中不打真實網路**
- [ ] fixtures 至少涵蓋：一般週末、Sprint Weekend、季末最後一站
- [ ] `npm run typecheck` 與 `npm test` 皆通過
