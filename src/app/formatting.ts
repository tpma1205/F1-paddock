import type { SessionKind } from '../domain/types.ts';

/**
 * Session 的中文標籤。
 *
 * 這些是 Interface Copy（介面文字）而非專有名詞，因此一律中文、不做雙語並陳。
 * 車隊／車手／賽道等專有名詞的中英對照另行維護（見 CONTEXT.md）。
 */
export const SESSION_LABEL: Record<SessionKind, string> = {
  fp1: '第一次自由練習',
  fp2: '第二次自由練習',
  fp3: '第三次自由練習',
  sprintQualifying: '衝刺排位賽',
  sprint: '衝刺賽',
  qualifying: '排位賽',
  race: '正賽',
};

/** 場次面板上使用的簡稱 —— 欄寬有限，用全名會擠掉時間。 */
export const SESSION_SHORT_LABEL: Record<SessionKind, string> = {
  fp1: 'FP1',
  fp2: 'FP2',
  fp3: 'FP3',
  sprintQualifying: '衝刺排位',
  sprint: '衝刺賽',
  qualifying: '排位賽',
  race: '正賽',
};

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** 把毫秒差拆成天／時／分／秒。負值一律夾為零 —— 進行中與已結束不該顯示負數。 */
export const toCountdown = (ms: number): Countdown => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
};

export const pad2 = (value: number): string => String(value).padStart(2, '0');

/** 使用者所在時區的 IANA 名稱，例如 "Asia/Taipei"。 */
export const resolveTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

const timeZonePart = (
  date: Date,
  timeZone: string,
  timeZoneName: 'long' | 'shortOffset',
): string =>
  new Intl.DateTimeFormat('zh-TW', { timeZone, timeZoneName })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value ?? '';

/**
 * 明確標示時區，例如「台北標準時間 GMT+8」。
 *
 * 時區是自動偵測的，因此**必須顯示出來** —— 否則使用者無從察覺時間被
 * 換算成了非預期的時區（見 docs/spec/0001）。
 */
export const formatTimeZoneLabel = (date: Date, timeZone: string): string => {
  const long = timeZonePart(date, timeZone, 'long');
  const offset = timeZonePart(date, timeZone, 'shortOffset');
  return [long, offset].filter(Boolean).join(' ') || timeZone;
};

/** 場次的星期，例如「週五」。 */
export const formatSessionDay = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('zh-TW', { timeZone, weekday: 'short' }).format(new Date(iso));

/** 場次的時刻，例如「19:30」。 */
export const formatSessionClock = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

/**
 * 場次列上的精簡倒數，例如「20 時 26 分」。
 *
 * **刻意不顯示秒數** —— 列表上同時有五個場次，跳動的秒數會讓整個面板
 * 不斷閃爍。完整到秒的倒數只出現在 Hero 的單一焦點上。
 */
export const formatCompactCountdown = (ms: number): string => {
  const { days, hours, minutes } = toCountdown(ms);

  if (days > 0) return `${days} 天 ${hours} 時`;
  if (hours > 0) return `${hours} 時 ${minutes} 分`;
  if (minutes > 0) return `${minutes} 分`;
  return '即將開始';
};

/** 資料新鮮度標示，例如「2026/09/10 22:52」。 */
export const formatFetchedAt = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('zh-TW', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
