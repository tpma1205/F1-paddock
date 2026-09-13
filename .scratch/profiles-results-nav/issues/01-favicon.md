# 01 — Favicon：紅底白「P」字標

**What to build:** 瀏覽器分頁列、iOS 主畫面、舊版瀏覽器都看得到同一個 F1 紅底、白色粗體「P」（右側一道斜切線）的圖示。一份 SVG 原稿是唯一真相，PNG 與 ICO 在建置前由它產生，不手工維護多份。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `favicon.svg` 原稿：`#e10600` 圓角方底、白色「P」、斜切線；不用 F1 官方字型或商標
- [ ] 建置前腳本由 SVG 產出 `apple-touch-icon.png`（180×180）與 `favicon.ico`（32×32）
- [ ] `index.html` 掛 `<link rel="icon" type="image/svg+xml">`、`apple-touch-icon`、ico 備援，路徑走 Vite base
- [ ] 預產生的每個路由 HTML 與 404.html 都帶同一組 link
- [ ] 線上驗證：分頁列與 `/F1-paddock/favicon.svg` 都能看到圖示
