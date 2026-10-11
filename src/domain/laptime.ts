/**
 * 單圈時間與差距的格式化 —— 在 View Model 完成，元件不做時間運算。
 * 輸入一律毫秒整數（Snapshot 的儲存格式）。
 */

/** `83008` → `1:23.008`；超過一小時不會發生（單圈最長也才兩分多鐘）。 */
export const formatLapMs = (ms: number): string => {
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

/** `442` → `+0.442`；第一名（0）為空字串，讓表格的第一列乾淨。 */
export const formatGapMs = (ms: number): string => (ms <= 0 ? '' : `+${(ms / 1000).toFixed(3)}`);

/** 完賽總時間：`5400500` → `1:30:00.500`；不足一小時為 `12:34.321`。 */
export const formatRaceTimeMs = (ms: number): string => {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const tail = `${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${tail}` : `${minutes}:${tail}`;
};
