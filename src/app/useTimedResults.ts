import { useEffect, useMemo, useState } from 'react';
import { loadTimedResults } from '../data/snapshot.ts';
import type { TimedResults } from '../domain/types.ts';
import { useLiveTimedResults } from './liveData.ts';

/**
 * 延遲載入該季的練習賽／衝刺排位名次表 sidecar。
 * 回傳 null 表示還在載入；載入後即使該季沒有檔案也是一個空表。
 * 「立即更新」補抓到的名次表（記憶體）疊在打包的 sidecar 之上。
 */
export const useTimedResults = (season: string): TimedResults | null => {
  const [timed, setTimed] = useState<TimedResults | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTimed(null);
    void loadTimedResults(season).then((loaded) => {
      if (!cancelled) setTimed(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [season]);

  const live = useLiveTimedResults();
  return useMemo(() => (timed === null ? null : { ...timed, ...live }), [timed, live]);
};
