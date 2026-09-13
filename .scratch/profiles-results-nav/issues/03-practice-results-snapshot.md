# 03 — 練習賽結果進快照，首頁場次面板標出第一名

**What to build:** 每週抓取時把 FP1–FP3（與衝刺排位）的名次、Best Lap、Gap 從 OpenF1 帶進快照。首頁場次面板上，已結束的練習賽或排位賽列在時間旁顯示第一名車手縮寫與 Best Lap——不進單站頁就知道誰最快。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 抓取：每季一次 OpenF1 sessions 取得 session_key，依 Round + 場次種類對到 Snapshot Session，日期比對為備援
- [ ] 抓取：每場次 OpenF1 session_result；車手用車號↔縮寫表對回 Driver（不可用 `permanentNumber`）；對不到的保留車號、driverId 為 null
- [ ] Snapshot Session 新增可選 `result`：`{ driverId | null, driverNumber, position, bestLapMs | null, gapMs | null, laps }`；時間存毫秒整數
- [ ] OpenF1 失敗時該場次 result 沿用上一份快照；無舊值為 null
- [ ] View Model SessionView 帶 `resultView`：解析 Driver／Team、Best Lap 格式 `1:23.008`、Gap 格式 `+0.442`（第一名為空）、無成績旗標
- [ ] 首頁場次面板：已結束的 FP／排位列旁顯示第一名縮寫與 Best Lap
- [ ] 測試：OpenF1 fixture（一般週末 + 衝刺週末）→ Snapshot → View Model；DNF／DNS 的 Best Lap 為 null；carry-forward
- [ ] 抓取實跑一次，快照大小記錄在票內
