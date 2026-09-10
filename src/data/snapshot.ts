import type { Snapshot } from '../domain/types.ts';

/**
 * 打包進程式的 Snapshot —— 畫面的**底稿**。
 *
 * 依 docs/adr/0001 的混合策略，它讓首屏立即可用、且在 API 失效時網站仍完整；
 * 執行期會在背景重新抓取並替換（於後續票次實作）。
 *
 * **儲存以 season 為索引鍵**（`snapshots/<season>.json`，見 docs/adr/0004）。
 * 抓取端寫入當前球季的檔案，跨年時自然寫進新的一份，舊的一份原地留存即成封存
 * —— 封存因此不需要搬移或改寫任何資料。
 */
const modules = import.meta.glob('./snapshots/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

const bySeason = new Map<string, Snapshot>();
for (const value of Object.values(modules)) {
  // JSON 匯入的推導型別會遺失可為 null 的欄位資訊（例如 permanentNumber、code），
  // 這裡是唯一的型別邊界，斷言僅此一處。
  const snapshot = value as Snapshot;
  bySeason.set(snapshot.season, snapshot);
}

/** 已封存的球季，由新到舊。 */
export const availableSeasons: string[] = [...bySeason.keys()].sort().reverse();

const latestSeason = availableSeasons[0];
const latest = latestSeason === undefined ? undefined : bySeason.get(latestSeason);

if (!latest) {
  throw new Error('找不到任何快照 —— 請先執行 `npm run fetch`。');
}

/** 最新一季的 Snapshot。球季由檔案決定，程式中不寫死年份。 */
export const bundledSnapshot: Snapshot = latest;
