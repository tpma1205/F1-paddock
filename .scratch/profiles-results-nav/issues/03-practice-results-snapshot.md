# 03 — 練習賽結果進快照，首頁場次面板標出第一名

**What to build:** 每週抓取時把 FP1–FP3（與衝刺排位）的名次、Best Lap、Gap 從 OpenF1 帶進快照。首頁場次面板上，已結束的練習賽或排位賽列在時間旁顯示第一名車手縮寫與 Best Lap——不進單站頁就知道誰最快。

**Blocked by:** None — can start immediately

**Status:** done

- [x] 抓取：每季一次 OpenF1 sessions 取得 session_key，依**開始時間 + 場次種類**對到 Snapshot Session（OpenF1 沒有 Round 編號，時間是唯一橋樑；容許 30 分鐘差）
- [x] 抓取：每場次 OpenF1 session_result；車手用車號↔縮寫表對回 Driver（不可用 `permanentNumber`）；對不到的保留車號、driverId 為 null
- [x] Snapshot Session 新增可選 `result`：`{ driverId | null, driverNumber, position, bestLapMs | null, gapMs | null, laps }`；時間存毫秒整數
- [x] OpenF1 失敗時該場次 result 沿用上一份快照；無舊值為 null
- [x] View Model SessionView 帶 `resultView`：解析 Driver／Team、Best Lap 格式 `1:23.008`、Gap 格式 `+0.442`（第一名為空）、無成績旗標
- [x] 首頁場次面板：已結束的 FP／排位列旁顯示第一名縮寫與 Best Lap
- [x] 測試：OpenF1 fixture（一般週末 + 衝刺週末）→ Snapshot → View Model；DNF／DNS 的 Best Lap 為 null；carry-forward
- [x] 抓取實跑一次，快照大小記錄在票內

**實跑記錄（2026-09-13，第 14 站排位後）：** OpenF1 未認證速率上限實測約 30 次／分（400ms 間隔跑到第 20 次即 429），改為 2.1 秒間隔 + 429 等 30 秒重試一次；抓取只補「已結束且上一份快照沒有」的場次，第一次全抓 37 個場次共 1m06s，之後每週只補新站。快照 402 KB（含 37 個場次名次表，較先前 +140 KB）；data chunk 267 KB／gzip 45 KB（先前 186 KB／34 KB）。拆 chunk 在票 04。
