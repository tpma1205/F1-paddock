import { useCallback, useMemo, useRef, useState } from 'react';
import { HttpError, refreshResults } from '../data/liveRefresh.ts';
import { loadTimedResults } from '../data/snapshot.ts';
import type { Snapshot, TimedResults } from '../domain/types.ts';
import { cooldownRemainingMs, describeOutcome, type StatusDescription } from './refreshStatus.ts';

/** 瀏覽器端的 fetchJson：非 2xx 丟 HttpError，供補抓邏輯辨識 401。 */
const browserFetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new HttpError(response.status, url);
  return response.json();
};

export interface LiveRefresh {
  /** 打包快照疊上補抓結果；沒補抓過就是原本的陣列。 */
  snapshots: Snapshot[];
  /** 補抓到的練習賽／衝刺排位名次表。 */
  timed: TimedResults;
  refreshing: boolean;
  /** 最近一次按下的結果；沒按過為 null。 */
  status: (StatusDescription & { checkedAt: string }) | null;
  cooldownMs: number;
  /** `season` 是目前畫面所用的賽程季（ViewModel.season）。 */
  refresh: (season: string) => Promise<void>;
}

/**
 * 「立即更新」的狀態：把可替換的 Snapshot 與名次表放在 React state，
 * 更新只影響當下瀏覽器（見 docs/adr/0005）。
 */
export const useLiveRefresh = (bundled: Snapshot[], now: Date): LiveRefresh => {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, Snapshot>>(new Map());
  const [timed, setTimed] = useState<TimedResults>({});
  const [status, setStatus] = useState<LiveRefresh['status']>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pressedAt, setPressedAt] = useState<number | null>(null);
  const busy = useRef(false);

  const snapshots = useMemo(
    () => bundled.map((snapshot) => overrides.get(snapshot.season) ?? snapshot),
    [bundled, overrides],
  );
  const cooldownMs = cooldownRemainingMs(pressedAt, now.getTime());

  const refresh = useCallback(async (season: string): Promise<void> => {
    const pressNow = new Date();
    if (busy.current || cooldownRemainingMs(pressedAt, pressNow.getTime()) > 0) return;
    const current = snapshots.find((s) => s.season === season);
    if (!current) return;

    busy.current = true;
    setRefreshing(true);
    try {
      // 打包的 sidecar 是疊加的底：已有的名次表不該被誤判成待補
      const base = { ...(await loadTimedResults(season)), ...timed };
      const outcome = await refreshResults({ snapshot: current, timed: base, now: pressNow, fetchJson: browserFetchJson });
      if (outcome.changed) {
        setOverrides((previous) => new Map(previous).set(season, outcome.snapshot));
        setTimed(outcome.timed);
      }
      // 沒發請求（沒有待補場次）不計冷卻
      if (outcome.requests > 0) setPressedAt(pressNow.getTime());
      setStatus({ ...describeOutcome(outcome), checkedAt: pressNow.toISOString() });
    } catch (error) {
      setPressedAt(pressNow.getTime());
      setStatus({
        tone: 'error',
        text: `更新失敗，已保留原本資料（${error instanceof Error ? error.message : String(error)}）`,
        checkedAt: pressNow.toISOString(),
      });
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, [pressedAt, snapshots, timed]);

  return { snapshots, timed, refreshing, status, cooldownMs, refresh };
};
