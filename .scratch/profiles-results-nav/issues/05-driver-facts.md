# 05 — 車手資歷：年齡、國籍中文、出道年

**What to build:** 車手頁多一張名片：「20 歲（2006-08-25）· 義大利 🇮🇹 · #12 · F1 第 2 季 · 2025 出道」。本季出道的新秀顯示「第 1 季 · 本季出道」。跨年後第 N 季自動 +1。

**Blocked by:** None — can start immediately（與 03 都動抓取腳本與 Snapshot 型別，建議在 03 之後依序做）

**Status:** ready-for-agent

- [ ] 抓取：Jolpica `dateOfBirth` 進 DriverRef
- [ ] 抓取：每位車手一次 Jolpica `results?limit=1` 取第一筆正賽的 season 作 `debutSeason`（不可用 `/seasons`）；失敗時 carry-forward
- [ ] 國籍（英文 demonym）→ 中文對照表；本季車手國籍缺對照時測試失敗
- [ ] View Model DriverView 帶 `age`、`birthDate`、`nationalityZh`、`seasonNumber`、`debutSeason`、`isRookie`
- [ ] 車手頁名片卡顯示上述欄位；缺 `debutSeason` 時該列隱藏
- [ ] 測試：生日前一天與當天的年齡邊界；2026 與 2027 注入時間下的第 N 季；本季出道特例
