import type { Snapshot } from '../domain/types.ts';
import raw from './snapshot.json' with { type: 'json' };

/**
 * 打包進程式的 Snapshot —— 畫面的**底稿**。
 *
 * 依 docs/adr/0001 的混合策略，它讓首屏立即可用、且在 API 失效時網站仍完整；
 * 執行期會在背景重新抓取並替換（於後續票次實作）。
 *
 * JSON 匯入的推導型別會遺失可為 null 的欄位資訊（例如 permanentNumber），
 * 這裡是唯一的型別邊界，斷言僅此一處。
 */
export const bundledSnapshot = raw as unknown as Snapshot;
