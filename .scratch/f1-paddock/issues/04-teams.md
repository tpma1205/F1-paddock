# 04 — 車隊列表與詳情

**What to build:** 瀏覽本季所有 Team：logo、中英文名稱、積分、名次，每一支以自己的代表色呈現。點進去看該隊的兩位 Driver、累計積分與勝場。

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `/teams` 列出本季全部 Team，含 logo、中英名稱、積分、名次
- [ ] `/teams/:id` 顯示該隊兩位 Driver、積分、勝場、名次
- [ ] 所有 logo 渲染進**同一固定尺寸容器**並施以統一的代表色處理
- [ ] Audi 與 Cadillac 使用自製字標（官方 CDN 查無檔案）
- [ ] 任何 logo 載入失敗時自動降級為字標，畫面不出現破圖
- [ ] Team 代表色取自資料而非寫死
- [ ] 低對比代表色（如 Cadillac、Red Bull）作為文字使用時自動提亮，作為圖形裝飾時保留原色
- [ ] 窄螢幕版型可用
