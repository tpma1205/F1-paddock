# 08 — 賽道簡介 + 長度

**What to build:** 賽道頁多一段繁中簡介，規格列多「賽道長度 5.278 km」與「正賽總里程 305.1 km」。

**Blocked by:** 06 — Profile 骨架

**Status:** ready-for-agent

- [ ] GeoJSON metadata 的 `lengthMetres` 進 CircuitView；View Model 算正賽總里程 = 長度 × 圈數
- [ ] 賽道頁規格列顯示長度（公里、小數三位）與總里程（小數一位）；缺長度時兩列隱藏
- [ ] 寫完本季 24 條賽道的簡介文字，遵守 06 的語氣規範與譯名表
- [ ] 完整性測試涵蓋 Circuit 表
- [ ] 測試：總里程計算
