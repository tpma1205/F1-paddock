# 07 — 賽程表與單站賽果

**What to build:** 看到本季完整 23 站賽程，一眼分辨哪些已完賽、哪些還沒。已完賽的直接顯示前三名；點進去看完整名次、積分與退賽狀態。

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `/calendar` 列出本季全部 Round，含日期、Circuit、中英名稱
- [ ] 已完賽與未來的 Race Weekend 在視覺上明確區分
- [ ] 已完賽的 Round 直接顯示前三名，不需點入
- [ ] `/races/:round` 顯示完整 Result：名次、Driver、Team、積分、退賽狀態
- [ ] 抓取腳本擴充為一併取得逐站 Result 並納入 Snapshot
- [ ] 未來的 Round 顯示倒數而非賽果
- [ ] 窄螢幕下積分榜保留名次／車手／積分三欄，其餘收進展開列
