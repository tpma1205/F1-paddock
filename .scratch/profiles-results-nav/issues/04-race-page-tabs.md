# 04 — 單站頁分頁籤：每個 Session 都有 Result

**What to build:** 單站頁變成分頁籤「正賽｜排位賽｜FP3｜FP2｜FP1」（衝刺週末依資料組成），打開時預設停在最新已結束的場次。練習賽表為名次／車手／Best Lap／Gap；排位賽表為名次／車手／Q1／Q2／Q3，淘汰節次以「—」呈現。

**Blocked by:** 03 — 練習賽結果進快照

**Status:** done

- [x] 籤順序固定：正賽 → 排位賽 → FP3 → FP2 → FP1（衝刺：正賽 → 排位賽 → 衝刺賽 → 衝刺排位 → FP1），只列資料有的場次
- [x] 預設籤 = View Model 的 `weekend.latestFinishedSession`；全部未開始時停用所有籤並顯示開始時間
- [x] 籤為 `role="tablist"`／`tab`／`tabpanel`，方向鍵切換；切籤不改網址
- [x] 練習賽表：名次／車手（Team 色條 + 中英名）／Best Lap／Gap；無成績顯示「無成績」
- [x] 排位賽表：名次／車手／Q1／Q2／Q3，被淘汰節次為「—」
- [x] 尚未取得結果的已結束場次顯示「結果尚未取得」
- [x] 手機：練習賽只留名次／車手／Best Lap，其餘收進可展開列；排位賽同理
- [x] 練習賽 result 拆成獨立 chunk，只在單站頁載入；首頁 chunk 大小不變
- [x] 測試：不同注入時間下的 `latestFinishedSession`（週五 FP1 後、週六排位後、週日正賽後、全未開始、Off-season）

**實作記錄：** 拆 chunk 的方式是把資料形狀拆開 —— 核心快照只留每個場次的第一名（`Session.leader`），完整名次表另存 `snapshots/timed/<season>.json` sidecar，由單站頁延遲載入（`loadTimedResults`）。首頁 data chunk 回到 193 KB／gzip 35 KB（票 03 前 186／34.5），sidecar 67 KB／gzip 9.4 KB 只在單站頁下載。同時移除四個內頁各自的假 breadcrumb（與票 02 的全站 Breadcrumb 重複且 class 撞名）。
