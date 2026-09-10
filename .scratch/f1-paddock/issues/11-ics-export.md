# 11 — 行事曆匯出（.ics）

**What to build:** 一鍵把整季賽程下載成行事曆檔，匯入 Google 或 Apple 日曆後，**每一個事件的時間都是對的**。

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] 可下載涵蓋本季全部 Race Weekend 的 .ics 檔
- [ ] 匯出檔含正確的時區資訊，匯入後顯示時間與網站一致
- [ ] 事件標題含 Race Weekend 中英名稱與 Session 名稱
- [ ] 產出格式符合 iCalendar 規範，可被 Google 日曆與 Apple 日曆接受
- [ ] .ics 產生器為純函式並具備自己的測試——**時區錯誤會安靜地發生，必須被測試守住**
