import type { RefreshOutcome } from '../data/liveRefresh.ts';

/** 「立即更新」按下後的冷卻時間，避免連按。 */
export const COOLDOWN_MS = 60_000;

/** 距離冷卻結束還有幾毫秒；從沒按過（null）或已過冷卻為 0。 */
export const cooldownRemainingMs = (lastPressedAtMs: number | null, nowMs: number): number =>
  lastPressedAtMs === null ? 0 : Math.max(0, lastPressedAtMs + COOLDOWN_MS - nowMs);

export type StatusTone = 'success' | 'info' | 'error';

export interface StatusDescription {
  tone: StatusTone;
  text: string;
}

/**
 * 一次更新的結果 → 畫面上的一句話。每種情況的文字彼此不同：
 * 「場次進行中」不是錯誤，「尚無資料」也不是，只有真的失敗才說「更新失敗」。
 */
export const describeOutcome = (outcome: RefreshOutcome): StatusDescription => {
  if (outcome.nothingPending) return { tone: 'info', text: '目前沒有待補結果的場次' };

  const { notes } = outcome;
  if (notes.some((n) => n.kind === 'live-session')) {
    return { tone: 'info', text: '場次進行中，結束後才能取得結果' };
  }

  const stale = notes.find((n) => n.kind === 'standings-stale');
  const error = notes.find((n) => n.kind === 'error');

  if (outcome.changed) {
    const extras = [
      stale ? '積分榜尚未更新，維持舊資料' : null,
      error ? '部分請求失敗' : null,
    ].filter((part): part is string => part !== null);
    return { tone: 'success', text: ['已更新', ...extras].join('，') };
  }

  if (error) return { tone: 'error', text: '更新失敗，已保留原本資料' };
  if (stale) return { tone: 'info', text: '積分榜尚未更新，維持舊資料' };
  if (notes.some((n) => n.kind === 'no-data-yet')) {
    return { tone: 'info', text: '資料來源還沒有資料，稍後再試' };
  }
  return { tone: 'info', text: '沒有新資料' };
};
