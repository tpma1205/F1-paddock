# 06 — 賽道列表與詳情（GeoJSON → SVG 描繪）

**What to build:** 瀏覽本季所有 Circuit，點進去看清晰的賽道平面圖——而且那條線會**隨著滾動一筆畫出來**。同頁呈現賽道長度、海拔、彎道數、比賽圈數與單圈紀錄。

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] `/circuits` 與 `/circuits/:id` 皆可用，涵蓋本季全部賽道
- [ ] 賽道平面圖由 GeoJSON 的 LineString 轉為 SVG path 自繪，不使用官方點陣圖
- [ ] 幾何轉換（投影、正規化、viewBox 貼合）為純函式並具備自己的測試——**這是全案最易出錯的一段**
- [ ] 不同緯度的賽道形狀不得被壓扁或拉伸
- [ ] 詳情頁的賽道線隨滾動以 stroke-dashoffset 描繪；`prefers-reduced-motion` 開啟時直接顯示完整線條
- [ ] 顯示長度、海拔（來自 GeoJSON）與彎道數、圈數、單圈紀錄（來自手工對照表）
- [ ] 某賽道缺 GeoJSON 時該頁其餘資訊仍完整呈現，不整頁失效
- [ ] 手機上圖形佔滿寬度且可放大檢視
