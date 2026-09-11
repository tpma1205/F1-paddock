import { useEffect, useState } from 'react';

/** 訂閱一條媒體查詢；SSR／測試環境沒有 matchMedia 時回傳 false。 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);

  return matches;
};

/**
 * 視差只在寬螢幕啟用 —— 窄螢幕（手機）的滾動行為不同、效能較差，
 * 且視差本質上是大螢幕的表演（見 docs/spec/0001）。
 */
export const PARALLAX_QUERY = '(min-width: 40rem)';
