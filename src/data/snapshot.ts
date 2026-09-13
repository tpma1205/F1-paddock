import type { Snapshot, TimedResults } from '../domain/types.ts';

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

/**
 * 所有打包進來的球季快照，由新到舊。
 *
 * 哪一季拿來當賽程、哪一季拿來當積分，由 buildViewModel 依「現在時間」決定
 * （見 docs/adr/0004）—— 這裡只負責把檔案全部交出去，不做時間判斷。
 */
export const bundledSnapshots: Snapshot[] = [...bySeason.values()].sort((a, b) =>
  b.season.localeCompare(a.season),
);

if (bundledSnapshots.length === 0) {
  throw new Error('找不到任何快照 —— 請先執行 `npm run fetch`。');
}

/** 最新一季 —— 供對照表與資產的涵蓋率測試使用；畫面一律用 bundledSnapshots。 */
export const bundledSnapshot: Snapshot = bundledSnapshots[0]!;

/**
 * 練習賽／衝刺排位名次表的 sidecar（`snapshots/timed/<season>.json`）——
 * **延遲載入**，只有單站頁會要。glob 不加 eager 就是各自一個 chunk。
 * 沒有該季的檔案時回傳空表，畫面顯示「結果尚未取得」。
 */
const timedModules = import.meta.glob('./snapshots/timed/*.json', { import: 'default' }) as Record<
  string,
  () => Promise<unknown>
>;

export const loadTimedResults = async (season: string): Promise<TimedResults> => {
  const load = timedModules[`./snapshots/timed/${season}.json`];
  return load ? ((await load()) as TimedResults) : {};
};
