import { useEffect, useState } from 'react';

/**
 * 每隔一段時間回傳新的「現在時間」，驅動倒數更新。
 *
 * 這是全站**唯一**讀取系統時鐘的地方 —— 時間由此往下作為參數傳入
 * buildViewModel，元件本身不做任何時間判斷（見 docs/spec/0001）。
 */
export const useNow = (intervalMs = 1_000): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
};
