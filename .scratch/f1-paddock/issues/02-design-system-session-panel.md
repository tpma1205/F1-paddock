# 02 — 設計系統與完整場次面板　🎯 視覺檢查點

**What to build:** 首頁呈現當前 Race Weekend 的**每一個** Session：星期、時間、以及該節的狀態。已結束的變暗，Next Session 高亮並內嵌倒數。Sprint Weekend 自動變成 FP1／衝刺排位／衝刺賽／排位／正賽五列，同一套版型吃下去。

同時確立整站的視覺語言：分層黑、F1 紅骨幹配色、字體、動畫基礎。

**這是視覺方向的檢查點**——完成後應該足以判斷整站質感是否正確。

**Blocked by:** 01

**Status:** done

- [x] 黑色採分層深灰（底／卡片／浮起三層），不使用純黑
- [x] F1 紅僅用於網站骨幹（導覽、倒數、狀態標籤、進度條），不外溢到內容
- [x] 字體為 Titillium Web（英數）+ Noto Sans TC（中文），具備可用的 fallback stack
- [x] 場次面板顯示該週末全部 Session，含國旗、Race Weekend 名稱與 Round 編號
- [x] Sprint Weekend 顯示衝刺排位與衝刺賽、不出現 FP2／FP3 的空欄位
- [x] 已結束的 Session 視覺變暗，Next Session 高亮且內嵌倒數
- [x] Framer Motion 進場動畫就位，且 `prefers-reduced-motion` 開啟時自動降為淡入
- [x] 所有動畫僅使用 transform／opacity
- [x] 窄螢幕下面板由表格轉為堆疊卡片，倒數獨立成行
