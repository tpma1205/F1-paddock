# 06 — Profile 骨架 + 車隊簡介

**What to build:** 車隊頁多一個「簡介」區塊：2–4 句繁中介紹，加上總部所在地與動力單元供應商。同時建立三張表共用的 Profile 資料檔與完整性測試，供 07／08 沿用。

**Blocked by:** None — can start immediately

**Status:** done

- [x] Profile 資料檔：Team／Driver／Circuit 三張表同檔，以實體 ID 為鍵，與譯名表分開
- [x] 完整性測試：Profile 鍵對不到本季實體 → 失敗；本季實體缺 Profile → 列出清單並警告（不失敗）
- [x] 「簡介」區塊元件：缺文字整段隱藏、缺欄位該列隱藏（不顯示「—」）
- [x] 寫完本季 11 支車隊的簡介文字 + 總部 + 動力單元；語氣規範：第三人稱、2–4 句、不寫會過期的數字、專有名詞遵守譯名表
- [x] Audi 與 Cadillac 的簡介說明出身，與改名前隊伍區分
- [x] 車隊頁顯示簡介區塊
