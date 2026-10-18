# 01 — 移除無意義動態與模板痕跡

**What to build:** 依 [規格書 0003](../../../docs/spec/0003-ui-design-cleanup.md) 移除：頂端滾動進度條、整頁區塊變色層（連同 `data-accent`）、賽道隨滾動描繪與 ghost 線（保留起跑點）、首頁 hero 暈光與視差、非招牌標題的全大寫、Logo／大頭照光暈、膠囊導覽。同步更新視覺系統文件與 styles.css 頂部註解。

**Blocked by:** None — can start immediately

**Triage:** ready-for-agent

**Status:** done

- [x] 任何頁面捲動都沒有頂端進度條，整頁背景不變色
- [x] 賽道詳情頁、放大檢視顯示完整靜止賽道線與紅色起跑點；列表縮圖樣式一致
- [x] 首頁 hero 無暈光、無視差；賽事名與直播中大字維持全大寫，其餘標題不再全大寫
- [x] Logo 與車手大頭照無彩色光暈；導覽連結為銳角，狀態 pill 保留圓角
- [x] 無殘留未使用的元件、變數、`data-accent`、樣式；`tsc` 與 build 通過
- [x] 規格 0001「視覺系統」與 styles.css 註解與實況一致
- [x] 在瀏覽器預覽各頁捲動與「減少動態」模式各驗證一次
