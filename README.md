# F1 Paddock

整合 F1 賽程、積分、車隊、車手與賽道的中英對照資訊站。黑色主視覺、滾動特效、時間自動換算成你的時區、資料每週自動更新、跨年自動換季。

**網站：<https://tpma1205.github.io/F1-paddock/>**

## 本機開發

```bash
npm ci            # 安裝依賴
npm run fetch     # 抓最新資料（可略過：repo 內已附一份快照）
npm run dev       # http://localhost:5173/F1-paddock/
```

```bash
npm test              # 227 個測試，不打網路
npm run typecheck     # tsc --noEmit
npm run build         # 型別檢查 → vite build → 為每個路由產生實體 HTML
npm run preview       # 用靜態伺服器檢視 dist/
```

## 資料怎麼更新

網站是純靜態的，沒有後端。資料由 GitHub Actions 的 [Deploy workflow](.github/workflows/deploy.yml) 維護：

| 時機 | 行為 |
|---|---|
| **每週二台北時間 10:00** | 自動抓取 → 建置 → 部署（正賽多在週日，週二賽果已定案） |
| **推 code 到 `main`** | 同上 |
| **手動** | GitHub → Actions → Deploy → **Run workflow** |

抓取失敗時沿用既有快照繼續建置，第三方服務的故障不會讓部署紅字。OpenF1 在直播期間會封鎖所有未認證請求，這時沿用上一份快照的代表色與照片。

抓到的資料**不會** commit 回 repo；只有「一季結束的最終狀態」與「新公布的下一季賽程」會被封存 commit 一次（見 [ADR-0004](docs/adr/0004-auto-rolling-season-with-archive.md)）。

### 資料來源

| 來源 | 內容 | 授權 |
|---|---|---|
| [Jolpica-F1](https://api.jolpi.ca/) | 賽程、積分、賽果、排位、衝刺賽 | 免金鑰，志工營運 |
| [OpenF1](https://openf1.org/) | 車隊代表色、車手照片網址 | 免金鑰（直播期間需認證） |
| [f1-circuits](https://github.com/bacinger/f1-circuits) | 賽道外框 GeoJSON | MIT，已 vendor 進 `src/data/circuits/` |
| F1 官方 CDN、flagcdn | 車隊 logo、車手照片、國旗 | 熱連結，不進 repo，皆有 onError 降級 |

賽道外框不會每週變，賽曆變動時手動跑 `npm run fetch:circuits`。

## 手工維護的資料

這是全站唯一無法自動化的部分，值得當作內容資產審閱：

- [`src/data/localisation.ts`](src/data/localisation.ts) — 車隊、車手、賽道、大獎賽的繁體中文譯名（台灣慣用譯法；無公認譯名者標 `provisional`）
- [`src/data/circuitInfo.ts`](src/data/circuitInfo.ts) — 賽道的彎道數、圈數、單圈紀錄與 GeoJSON 對照。**單圈紀錄會被刷新，需人工跟進。**

漏掉本季任何一筆，測試會紅燈。

## 專案文件

- [`CONTEXT.md`](CONTEXT.md) — 語彙表（Race Weekend、Session、Round、Canonical／Localised Name…）
- [`docs/spec/0001-f1-paddock.md`](docs/spec/0001-f1-paddock.md) — 規格書
- [`docs/adr/`](docs/adr/) — 架構決策：資料策略、GitHub Pages 路由、圖片政策、換季封存

## 架構速覽

```
原始 API 回應 ──normalise──► Snapshot ──buildViewModel(now)──► View Model ──► UI
 (第三方形狀)               (內部形狀，        (純函式；「現在時間」        (純呈現)
                            以 season 索引)     是顯式參數)
```

`buildViewModel` 是主要的測試接縫：所有與時間有關的推導（下一個場次、場次狀態、換季、Off-season）都在裡面，以注入時間測試——這些情境在真實世界一年只發生一次。

- `src/data/` 抓取與正規化、快照、手工對照表
- `src/domain/` 型別、View Model、路由清單、賽道幾何
- `src/app/` 共用元件（設計系統在 `src/styles.css`）
- `src/pages/` 各路由頁面（依路由延遲載入）
- `scripts/` 抓取、賽道下載、路由預產生、封存判斷

## 授權

程式碼 MIT。資料歸各來源所有；F1 相關商標歸 Formula One Licensing BV。
