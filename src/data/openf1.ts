/**
 * OpenF1 的**原始**回應形狀與合併邏輯。
 *
 * OpenF1 補足 Jolpica 沒有的兩樣東西：**車隊代表色**與**車手照片網址**。
 * 兩個 API 沒有共用的識別碼 —— OpenF1 的 team_name（"Red Bull Racing"）
 * 對不上 Jolpica 的 constructorId（"red_bull"）—— 所以用**車手三字母縮寫**
 * 當橋樑：Jolpica 的 `code` 與 OpenF1 的 `name_acronym` 是同一套官方縮寫。
 */
import type { Session, SessionKind, TimedResult, TimedResults } from '../domain/types.ts';

export interface RawOpenF1Driver {
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  /** 不含 # 的六碼十六進位，例如 "F47600"；可能為 null。 */
  team_colour: string | null;
  headshot_url: string | null;
}

export interface OpenF1DriverInfo {
  /** 含 # 的十六進位色碼。 */
  teamColour: string | null;
  headshotUrl: string | null;
}

const HEX_COLOUR = /^[0-9a-fA-F]{6}$/;

/** 以縮寫為鍵整理 OpenF1 車手，供合併時查詢。 */
export const indexOpenF1Drivers = (
  drivers: ReadonlyArray<RawOpenF1Driver>,
): ReadonlyMap<string, OpenF1DriverInfo> => {
  const byCode = new Map<string, OpenF1DriverInfo>();

  for (const driver of drivers) {
    // 同一位車手可能在回應中出現多次（不同 session），保留第一筆即可。
    if (byCode.has(driver.name_acronym)) continue;

    byCode.set(driver.name_acronym, {
      teamColour:
        driver.team_colour && HEX_COLOUR.test(driver.team_colour)
          ? `#${driver.team_colour.toLowerCase()}`
          : null,
      headshotUrl: driver.headshot_url || null,
    });
  }

  return byCode;
};

// ---------------------------------------------------------------- 場次結果

/**
 * OpenF1 補的第二樣東西：**沒有 Jolpica 來源的場次的 Result** —— FP1–FP3 與
 * 衝刺排位。排位賽／正賽／衝刺賽維持用 Jolpica，避免同一場次兩個來源。
 */

export interface RawOpenF1Session {
  session_key: number;
  meeting_key: number;
  /** "Practice 1"、"Sprint Qualifying"、"Qualifying"、"Sprint"、"Race"；季前測試是 "Day 1" 等。 */
  session_name: string;
  /** ISO 8601，含時區偏移。 */
  date_start: string;
}

export interface RawOpenF1SessionResult {
  position: number | null;
  driver_number: number;
  number_of_laps: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  /** 練習賽是秒數；衝刺排位／排位賽是三節的陣列（未參與的節為 null）。沒時間為 null 或缺欄。 */
  duration?: number | Array<number | null> | null;
  gap_to_leader?: number | string | Array<number | string | null> | null;
}

/** OpenF1 的 session_name → 本站的場次種類。對不上（季前測試）為 undefined。 */
const SESSION_NAME_TO_KIND: Record<string, SessionKind> = {
  'Practice 1': 'fp1',
  'Practice 2': 'fp2',
  'Practice 3': 'fp3',
  'Sprint Qualifying': 'sprintQualifying',
  'Sprint Shootout': 'sprintQualifying', // 衝刺排位的舊名
  Qualifying: 'qualifying',
  Sprint: 'sprint',
  Race: 'race',
};

/** 由 OpenF1 取 Result 的場次種類。 */
export const TIMED_KINDS: ReadonlySet<SessionKind> = new Set(['fp1', 'fp2', 'fp3', 'sprintQualifying']);

/** 兩邊的開始時間偶爾差幾分鐘（改期、時區換算），容許半小時內。 */
const MATCH_TOLERANCE_MS = 30 * 60_000;

/**
 * 找出 Snapshot 的某個 Session 在 OpenF1 對應的 session_key：**種類相同且開始
 * 時間最接近**（半小時內）。OpenF1 沒有 Round 編號，時間是唯一可靠的橋樑；
 * 不比對 session_name 以外的字串。
 */
export const matchOpenF1Session = (
  session: Pick<Session, 'kind' | 'startsAt'>,
  openF1Sessions: ReadonlyArray<RawOpenF1Session>,
): number | null => {
  const target = Date.parse(session.startsAt);
  let best: { key: number; distance: number } | null = null;
  for (const candidate of openF1Sessions) {
    if (SESSION_NAME_TO_KIND[candidate.session_name] !== session.kind) continue;
    const distance = Math.abs(Date.parse(candidate.date_start) - target);
    if (distance > MATCH_TOLERANCE_MS) continue;
    if (!best || distance < best.distance) best = { key: candidate.session_key, distance };
  }
  return best?.key ?? null;
};

const toMs = (seconds: number | string | null | undefined): number | null => {
  const n = typeof seconds === 'string' ? Number(seconds) : seconds;
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 1000) : null;
};

/** 三節制（衝刺排位）：最快圈取各節最小值。 */
const bestOf = (duration: RawOpenF1SessionResult['duration']): number | null => {
  if (Array.isArray(duration)) {
    const valid = duration.map(toMs).filter((ms): ms is number => ms !== null);
    return valid.length > 0 ? Math.min(...valid) : null;
  }
  return toMs(duration);
};

/** 三節制：差距取最後參與那一節。 */
const gapOf = (gap: RawOpenF1SessionResult['gap_to_leader']): number | null => {
  if (Array.isArray(gap)) {
    const valid = gap.map(toMs).filter((ms): ms is number => ms !== null);
    return valid.at(-1) ?? null;
  }
  return toMs(gap);
};

/**
 * OpenF1 名次表 → TimedResult。
 *
 * 車手對應走 **OpenF1 自己的車號 ↔ 縮寫表**，再以縮寫對回 Jolpica 車手。
 * 不可用 Jolpica 的 permanentNumber：冠軍掛 1 號、Verstappen 改用 3 號，
 * permanentNumber 都對不上。
 */
export const toTimedResults = (
  rows: ReadonlyArray<RawOpenF1SessionResult>,
  numberToCode: ReadonlyMap<number, string>,
  codeToDriverId: ReadonlyMap<string, string>,
): TimedResult[] =>
  rows
    .flatMap((row) => (row.position === null ? [] : [{ ...row, position: row.position }]))
    .map((row) => {
      const code = numberToCode.get(row.driver_number);
      const bestLapMs = row.dns ? null : bestOf(row.duration);
      return {
        driverId: (code && codeToDriverId.get(code)) ?? null,
        driverNumber: row.driver_number,
        position: row.position,
        bestLapMs,
        gapMs: bestLapMs === null ? null : gapOf(row.gap_to_leader),
        laps: row.number_of_laps ?? 0,
      };
    })
    .sort((a, b) => a.position - b.position);

/** OpenF1 的車手清單（可跨多個 meeting）→ 車號 ↔ 縮寫。先到先得。 */
export const indexDriverNumbers = (
  drivers: ReadonlyArray<Pick<RawOpenF1Driver, 'driver_number' | 'name_acronym'>>,
): ReadonlyMap<number, string> => {
  const byNumber = new Map<number, string>();
  for (const driver of drivers) {
    if (!byNumber.has(driver.driver_number)) byNumber.set(driver.driver_number, driver.name_acronym);
  }
  return byNumber;
};

/**
 * OpenF1 在直播期間封鎖所有請求（見 fetch 腳本的 carryForwardOpenF1），這時
 * 新抓的名次表會缺場次。已結束場次的名次表不會再變，上一份 sidecar 有的
 * 直接補上；新抓到的優先。
 */
export const carryForwardTimedResults = (next: TimedResults, previous: TimedResults | null): TimedResults =>
  previous ? { ...previous, ...next } : next;
