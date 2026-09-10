# F1 資訊站

一個整合公開 F1 資料的純前端網站，呈現當前球季的賽程、積分、車隊、車手與賽道資訊。

本文件是專案的**統一語彙表**，只定義詞彙，不記錄實作決策（實作決策請看 `docs/adr/`）。

## Language

### 賽事結構

**Race Weekend（賽事週末）**:
一站大獎賽的完整週末，包含底下所有場次。這是使用者心中「一場比賽」的單位。
_Avoid_: Meeting、Grand Prix、比賽、賽事（單獨使用時語意太模糊）

**Session（場次）**:
賽事週末底下的單一項目：FP1、FP2、FP3、衝刺排位、衝刺賽、排位賽、正賽。每個場次有自己的開始時間與狀態。
_Avoid_: 節、賽段、Event

**Round（站次）**:
一個賽事週末在球季中的序號，例如「第 14 站」。
_Avoid_: Race number、第幾場

**Sprint Weekend（衝刺賽週末）**:
場次組成不同的賽事週末——沒有 FP2 與 FP3，改為衝刺排位與衝刺賽。場次清單必須由資料決定，不可寫死。
_Avoid_: Sprint race weekend、短衝刺

**Next Session（下一節）**:
以當下時間為準，尚未開始的最早一個場次。首頁大倒數與場次面板的高亮列都指向它。
_Avoid_: Upcoming race、下一場

**Off-season（球季空窗期）**:
本季最後一場正賽結束後、下季開幕前的期間。此時不存在 Next Session。
_Avoid_: 休賽期、Winter break

### 參賽者與場地

**Team（車隊）**:
參賽的製造商隊伍，例如 Mercedes、Cadillac。爭奪的是車隊冠軍。
_Avoid_: Constructor（Jolpica API 的用字，僅在描述 API 原始回應時使用）、廠隊

**Driver（車手）**:
參賽的個人選手。爭奪的是車手冠軍。

**Circuit（賽道）**:
實體賽道場地，例如 Madring、Suzuka。與 Race Weekend 是多對一——同一條賽道可能在不同年份辦不同名稱的大獎賽。
_Avoid_: Track、賽車場

**Standings（積分榜）**:
球季累計積分排名，分為車手積分榜與車隊積分榜。與單場 Result（賽果）不同。
_Avoid_: Ranking、排行

**Result（賽果）**:
單一場次結束後的名次與成績。與 Standings 不同。
_Avoid_: Classification、成績

### 雙語命名

**Canonical Name（正式名稱）**:
實體的英文名稱，是它在賽場、轉播與官方文件上的正式識別。畫面上以大字呈現。
_Avoid_: 原文名、English name（作為欄位名時）

**Localised Name（中文名稱）**:
實體的繁體中文譯名，作為輔助理解置於正式名稱下方。一律採**台灣慣用譯名**（McLaren → 麥拉倫、Mercedes → 賓士、Aston Martin → 奧斯頓馬丁），不採中國譯名。
_Avoid_: 翻譯、中譯、Chinese name

**Provisional Name（暫定譯名）**:
尚無台灣媒體公認譯名的實體（多為新進車手）所採用的音譯，標記為暫定以便日後修正。
_Avoid_: 暫譯、待確認譯名

**Interface Copy（介面文字）**:
導覽、標籤、狀態與說明等非專有名詞的文字，一律使用繁體中文，不做雙語並陳。
_Avoid_: UI 文案、系統文字
