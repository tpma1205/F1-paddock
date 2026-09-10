# 03 — 中文對照表與雙語呈現規則

**What to build:** 畫面上的專有名詞開始出現中文：英文大字在上、中文小字在下。介面文字（導覽、狀態、說明）則一律繁體中文。

建立本專案**唯一的手工資產**——約 80 筆中英對照表，涵蓋 Team、Driver、Circuit 與 Race Weekend 名稱，一律採台灣慣用譯名。尚無公認譯名者標記為 Provisional Name。

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] 對照表為進版控的靜態資料，非抓取結果
- [ ] 涵蓋本季全部 Team、Driver、Circuit 與 Race Weekend 名稱
- [ ] 譯名採台灣慣用譯法（麥拉倫／賓士／奧斯頓馬丁），不採中國譯名
- [ ] 無公認譯名者標記為 Provisional Name，且畫面上可辨識
- [ ] 對照表缺漏某筆時，畫面**降級為只顯示英文而非顯示空白或報錯**
- [ ] 雙語呈現規則落成可複用元件：專有名詞英文大字 + 中文小字
- [ ] Interface Copy 全繁體中文，不做雙語並陳
- [ ] Race Weekend 中文名於 Hero 與場次面板上生效
