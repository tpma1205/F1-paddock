import { SESSION_DURATION_MINUTES, type SessionKind } from './types.ts';

/**
 * iCalendar（RFC 5545）產生器 —— 純函式，無 DOM 依賴。
 *
 * 時間一律以 **UTC（`Z` 後綴）** 表示。這是刻意的：UTC 時間在 iCalendar 裡
 * 沒有歧義，Google／Apple 日曆匯入後會自動換算成使用者所在時區，不需要
 * VTIMEZONE 區塊，也避開日光節約時間的坑。時區錯誤會安靜地發生 —— 匯進
 * 手機日曆顯示錯的時間、沒有任何錯誤訊息 —— 所以這裡的行為由測試守住。
 */

const SESSION_LABEL: Record<SessionKind, string> = {
  fp1: '第一次自由練習',
  fp2: '第二次自由練習',
  fp3: '第三次自由練習',
  sprintQualifying: '衝刺排位賽',
  sprint: '衝刺賽',
  qualifying: '排位賽',
  race: '正賽',
};

const MAX_LINE_OCTETS = 75;

/** UTF-8 位元組數 —— 用 TextEncoder 而非 Node 的 Buffer，瀏覽器裡也要能跑。 */
const encoder = new TextEncoder();
const byteLength = (text: string): number => encoder.encode(text).length;

/** RFC 5545 §3.3.11：反斜線、分號、逗號與換行必須跳脫。 */
export const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/**
 * RFC 5545 §3.1：每行不得超過 75 位元組，超過要折行，續行以一個空白開頭。
 * 以**位元組**而非字元計算，且不能把多位元組字元從中間切斷 —— 中文標題
 * 就是會踩到這兩點的案例。
 */
export const foldLine = (line: string): string => {
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of line) {
    const bytes = byteLength(char);
    // 續行的第一個字元是空白，所以續行內容上限是 74。
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);

  return parts.map((part, i) => (i === 0 ? part : ` ${part}`)).join('\r\n');
};

/** ISO 8601 → iCalendar UTC 格式 `20260913T130000Z`。 */
const toIcsUtc = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
};

/** 產生行事曆所需的最小形狀 —— RaceWeekend 與 WeekendView 都符合。 */
export interface CalendarWeekend {
  round: number;
  name: string;
  circuit: { name: string; locality: string };
  sessions: ReadonlyArray<{ kind: SessionKind; startsAt: string }>;
}

export interface CalendarInput {
  season: string;
  weekends: ReadonlyArray<CalendarWeekend>;
  /** DTSTAMP 用的時間（ISO）；傳快照時間讓產出可重現。 */
  stamp: string;
  /** 網站根網址，事件描述會連回該站的賽果頁。 */
  siteUrl: string;
  /** 大獎賽的中文名；沒有時回傳 null，標題只用英文。 */
  localiseRace: (raceName: string) => string | null;
}

export const buildCalendar = ({ season, weekends, stamp, siteUrl, localiseRace }: CalendarInput): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//F1 Paddock//F1 Calendar//ZH-TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:F1 ${season} 賽程`,
    'X-WR-TIMEZONE:UTC',
  ];

  const dtstamp = toIcsUtc(stamp);

  for (const weekend of weekends) {
    const zh = localiseRace(weekend.name);
    const raceTitle = zh ? `${zh} ${weekend.name}` : weekend.name;

    for (const session of weekend.sessions) {
      const start = Date.parse(session.startsAt);
      const end = start + SESSION_DURATION_MINUTES[session.kind] * 60_000;

      lines.push(
        'BEGIN:VEVENT',
        `UID:${season}-r${weekend.round}-${session.kind}@f1-paddock`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${toIcsUtc(session.startsAt)}`,
        `DTEND:${toIcsUtc(new Date(end).toISOString())}`,
        `SUMMARY:${escapeText(`F1 · ${raceTitle} · ${SESSION_LABEL[session.kind]}`)}`,
        `LOCATION:${escapeText(`${weekend.circuit.name}, ${weekend.circuit.locality}`)}`,
        `DESCRIPTION:${escapeText(`第 ${weekend.round} 站 · ${weekend.circuit.name}\n${siteUrl}/races/${weekend.round}`)}`,
        `URL:${siteUrl}/races/${weekend.round}`,
        'END:VEVENT',
      );
    }
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n');
};
