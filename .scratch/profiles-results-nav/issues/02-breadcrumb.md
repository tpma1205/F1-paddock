# 02 — Breadcrumb：頂欄下方的路徑導覽

**What to build:** 從首頁點進安東內利，頂欄 F1 PADDOCK 下方出現「首頁 / 車手 / 安東內利」。前兩段可點回上層，最後一段是目前頁面、不可點。首頁不顯示。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 段落鏈由 domain 層依路由產生（`breadcrumbFor`），各頁面不自行拼字串
- [ ] 段落規則：首頁 → 列表頁（車隊／車手／賽道／賽程）→ 實體頁；單站頁的實體段為大獎賽譯名
- [ ] 最後一段用中文譯名，沒有譯名時用英文名（只中文，不雙語）
- [ ] 元件為 `nav aria-label="路徑導覽"` + 有序列表，最後一段 `aria-current="page"`，分隔符「/」
- [ ] 首頁不渲染 Breadcrumb
- [ ] 窄螢幕單列：`nowrap` + 尾端截斷
- [ ] 測試掃描 `routesFor` 產出的全部路由，每一條都有段落鏈且末段非空；譯名缺席時回退英文；首頁為空
