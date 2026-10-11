/**
 * 執行期補抓（「立即更新」）的邏輯 —— 見 docs/adr/0005。
 *
 * 本檔案是純邏輯：網路請求由呼叫端注入的 `fetchJson` 完成，所以瀏覽器與測試
 * 共用同一份程式，測試不打真實網路。
 */
import {
  normaliseRoundResults,
  normaliseStandingsUpdate,
  type RawDriverStandingsResponse,
  type RawQualifyingResponse,
  type RawResultsResponse,
  type RawSprintResponse,
  type RawTeamStandingsResponse,
} from './jolpica.ts';
import {
  TIMED_KINDS,
  carryForwardTimedResults,
  indexDriverNumbers,
  matchOpenF1Session,
  toProvisionalResults,
  toTimedResults,
  type RawOpenF1Driver,
  type RawOpenF1Session,
  type RawOpenF1SessionResult,
} from './openf1.ts';
import {
  timedKey,
  type ProvisionalKind,
  type ProvisionalResults,
  type RaceWeekend,
  type SessionKind,
  type Snapshot,
  type TimedResults,
} from '../domain/types.ts';

const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
const OPENF1 = 'https://api.openf1.org/v1';

/** 一次按下最多發幾個請求：Jolpica 3 + 積分榜 2 + OpenF1（場次清單、車手、至多 3 場次）5。 */
export const MAX_REQUESTS_PER_REFRESH = 10;

/** 非 2xx 的回應。OpenF1 在直播期間回 401。 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, url: string) {
    super(`${url} -> HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

const MINUTE_MS = 60_000;

/**
 * 場次開始後多久，才認為它的結果「應該已經出來」—— 開始後的固定時長，含緩衝。
 *
 * 與 `SESSION_DURATION_MINUTES`（只驅動「進行中／已結束」的顯示）不同：這裡要的是
 * 「值得去問 API 的時間點」，偏保守，寧可晚一點讓更新生效，也不在直播中誤判。
 * 正賽留 3.5 小時是因為紅旗可能把比賽拖長。
 */
export const RESULT_DUE_MINUTES: Record<SessionKind, number> = {
  fp1: 90,
  fp2: 90,
  fp3: 90,
  sprintQualifying: 90,
  sprint: 90,
  qualifying: 120,
  race: 210,
};

/** 一次補抓最多處理幾個場次。 */
export const MAX_SESSIONS_PER_REFRESH = 3;

/** 場次的補抓優先序：使用者最想先看到的在前。 */
const PRIORITY: ReadonlyArray<SessionKind> = [
  'race',
  'qualifying',
  'sprint',
  'sprintQualifying',
  'fp3',
  'fp2',
  'fp1',
];

export interface Pending {
  /** 要補的賽事週末；沒有待補場次時為 null。 */
  round: number | null;
  /** 待補的場次，依優先序，最多 MAX_SESSIONS_PER_REFRESH 個。 */
  sessions: SessionKind[];
  /** 已有正賽結果、但積分榜的站次落後 —— 積分榜待補。 */
  standingsBehind: boolean;
}

const hasOfficialResult = (weekend: RaceWeekend, kind: SessionKind, timed: TimedResults): boolean => {
  switch (kind) {
    case 'race':
      return weekend.results !== null;
    case 'sprint':
      return weekend.sprintResults !== null;
    case 'qualifying':
      return weekend.qualifying !== null;
    default:
      return (timed[timedKey(weekend.round, kind)]?.length ?? 0) > 0;
  }
};

const isDue = (weekend: RaceWeekend, kind: SessionKind, nowMs: number): boolean => {
  const session = weekend.sessions.find((s) => s.kind === kind);
  return session !== undefined && Date.parse(session.startsAt) + RESULT_DUE_MINUTES[kind] * MINUTE_MS <= nowMs;
};

/**
 * 找出該補什麼：**最近一個已有到期場次的賽事週末**裡，到期而沒有正式結果的場次。
 *
 * 只看一個週末 —— 舊週末的缺口（例如當初 OpenF1 直播中被擋）不是這個按鈕的事。
 * 只有暫定結果的場次仍算待補，要等正式結果取代它。
 */
export const findPending = (snapshot: Snapshot, timed: TimedResults, now: Date): Pending => {
  const nowMs = now.getTime();

  const latest = [...snapshot.weekends]
    .sort((a, b) => b.round - a.round)
    .find((weekend) => weekend.sessions.some((s) => isDue(weekend, s.kind, nowMs)));

  const sessions = latest
    ? PRIORITY.filter(
        (kind) =>
          latest.sessions.some((s) => s.kind === kind) &&
          isDue(latest, kind, nowMs) &&
          !hasOfficialResult(latest, kind, timed),
      ).slice(0, MAX_SESSIONS_PER_REFRESH)
    : [];

  const latestRaceRound = Math.max(0, ...snapshot.weekends.filter((w) => w.results !== null).map((w) => w.round));
  const standingsBehind = latestRaceRound > (snapshot.completedRound ?? 0);

  return { round: sessions.length > 0 && latest ? latest.round : null, sessions, standingsBehind };
};

// ---------------------------------------------------------------- 補抓流程

export type RefreshNote =
  /** OpenF1 回 401：場次進行中，結束後才能取得。 */
  | { kind: 'live-session' }
  /** 該抓的都問過了，兩邊都還沒有資料。 */
  | { kind: 'no-data-yet'; sessions: SessionKind[] }
  /** Jolpica 的積分榜站次落後於剛取得的正賽結果 —— 丟棄，不自行推算。 */
  | { kind: 'standings-stale'; expected: number; got: number }
  | { kind: 'error'; detail: string };

export interface RefreshOutcome {
  /** 沒有變化時就是傳入的同一個物件。 */
  snapshot: Snapshot;
  timed: TimedResults;
  changed: boolean;
  /** 沒有待補場次，未發出任何請求。 */
  nothingPending: boolean;
  requests: number;
  notes: RefreshNote[];
}

export interface RefreshInput {
  snapshot: Snapshot;
  timed: TimedResults;
  now: Date;
  /** 成功回傳解析後的 JSON；非 2xx 丟 HttpError；網路失敗丟任何其他錯誤。 */
  fetchJson: (url: string) => Promise<unknown>;
}

const JOLPICA_ENDPOINT: Record<ProvisionalKind, string> = {
  race: 'results',
  qualifying: 'qualifying',
  sprint: 'sprint',
};

const isProvisionalKind = (kind: SessionKind): kind is ProvisionalKind =>
  kind === 'race' || kind === 'qualifying' || kind === 'sprint';

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

interface OfficialResults {
  results?: NonNullable<RaceWeekend['results']>;
  sprintResults?: NonNullable<RaceWeekend['sprintResults']>;
  qualifying?: NonNullable<RaceWeekend['qualifying']>;
}

/**
 * 立即更新：只針對 `findPending` 找出的場次補資料（見 docs/adr/0005）。
 *
 * 排位賽／衝刺賽／正賽先問 Jolpica，沒有才用 OpenF1 產生暫定結果；練習賽與衝刺排位
 * 只有 OpenF1。積分榜只從 Jolpica 取，且站次落後就丟棄。任何失敗都保留原資料。
 * 請求依序送出，總數不超過 MAX_REQUESTS_PER_REFRESH。
 */
export const refreshResults = async ({ snapshot, timed, now, fetchJson }: RefreshInput): Promise<RefreshOutcome> => {
  const pending = findPending(snapshot, timed, now);
  if (pending.sessions.length === 0 && !pending.standingsBehind) {
    return { snapshot, timed, changed: false, nothingPending: true, requests: 0, notes: [] };
  }

  const notes: RefreshNote[] = [];
  let requests = 0;
  const get = async <T>(url: string): Promise<T> => {
    if (requests >= MAX_REQUESTS_PER_REFRESH) throw new Error('超過單次更新的請求上限');
    requests += 1;
    return (await fetchJson(url)) as T;
  };

  const weekend = snapshot.weekends.find((w) => w.round === pending.round);
  const season = snapshot.season;

  const official: OfficialResults = {};
  const provisional: ProvisionalResults = {};
  const newTimed: TimedResults = {};
  const needOpenF1: SessionKind[] = [];

  // 1. Jolpica：排位賽、衝刺賽、正賽
  if (weekend) {
    for (const kind of pending.sessions) {
      if (!isProvisionalKind(kind)) {
        needOpenF1.push(kind);
        continue;
      }
      try {
        const response = await get<RawResultsResponse & RawSprintResponse & RawQualifyingResponse>(
          `${JOLPICA}/${season}/${weekend.round}/${JOLPICA_ENDPOINT[kind]}/?format=json&limit=100`,
        );
        const input =
          kind === 'race' ? { results: response } : kind === 'sprint' ? { sprints: response } : { qualifying: response };
        const rows = normaliseRoundResults(weekend.round, input);
        if (kind === 'race' && rows.results) official.results = rows.results;
        else if (kind === 'sprint' && rows.sprintResults) official.sprintResults = rows.sprintResults;
        else if (kind === 'qualifying' && rows.qualifying) official.qualifying = rows.qualifying;
        else needOpenF1.push(kind);
      } catch (error) {
        notes.push({ kind: 'error', detail: describeError(error) });
        needOpenF1.push(kind); // Jolpica 暫時掛了，仍可由 OpenF1 給暫定結果
      }
    }
  }

  // 2. OpenF1：暫定結果與練習賽／衝刺排位
  if (weekend && needOpenF1.length > 0) {
    try {
      const sessions = await get<RawOpenF1Session[]>(`${OPENF1}/sessions?year=${season}`);
      const matched = needOpenF1.flatMap((kind) => {
        const session = weekend.sessions.find((s) => s.kind === kind);
        const key = session ? matchOpenF1Session(session, sessions) : null;
        return key === null ? [] : [{ kind, key }];
      });
      const meeting =
        matched.length > 0 ? sessions.find((s) => s.session_key === matched[0]!.key)?.meeting_key : undefined;
      if (meeting !== undefined) {
        const drivers = await get<RawOpenF1Driver[]>(`${OPENF1}/drivers?meeting_key=${meeting}`);
        const numberToCode = indexDriverNumbers(drivers);
        const codeToDriverId = new Map(
          snapshot.driverStandings.flatMap((s) => (s.driver.code ? [[s.driver.code, s.driver.id] as const] : [])),
        );
        const driverToTeam = new Map(
          snapshot.driverStandings.flatMap((s) => {
            const team = s.teams.at(-1);
            return team ? [[s.driver.id, team.id] as const] : [];
          }),
        );
        for (const { kind, key } of matched) {
          const rows = await get<RawOpenF1SessionResult[]>(`${OPENF1}/session_result?session_key=${key}`);
          if (!Array.isArray(rows) || rows.length === 0) continue;
          if (isProvisionalKind(kind)) {
            provisional[kind] = toProvisionalResults(kind, rows, numberToCode, codeToDriverId, driverToTeam);
          } else if (TIMED_KINDS.has(kind)) {
            newTimed[timedKey(weekend.round, kind)] = toTimedResults(rows, numberToCode, codeToDriverId);
          }
        }
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) notes.push({ kind: 'live-session' });
      else notes.push({ kind: 'error', detail: describeError(error) });
    }

    const missing = needOpenF1.filter((kind) =>
      isProvisionalKind(kind) ? !provisional[kind] : !newTimed[timedKey(weekend.round, kind)],
    );
    if (missing.length > 0 && notes.length === 0) notes.push({ kind: 'no-data-yet', sessions: missing });
  }

  // 3. 套用場次結果
  let next = applyResults(snapshot, weekend?.round ?? null, official, provisional, newTimed);

  // 4. 積分榜：只在拿到正式的衝刺賽／正賽結果、或積分榜本來就落後時才抓
  const gotPoints = official.results !== undefined || official.sprintResults !== undefined;
  if (gotPoints || pending.standingsBehind) {
    const expected = Math.max(0, ...next.weekends.filter((w) => w.results !== null).map((w) => w.round));
    try {
      const drivers = await get<RawDriverStandingsResponse>(`${JOLPICA}/${season}/driverstandings/?format=json&limit=30`);
      const teams = await get<RawTeamStandingsResponse>(`${JOLPICA}/${season}/constructorstandings/?format=json&limit=30`);
      const update = normaliseStandingsUpdate(next, drivers, teams);
      if (!update || update.round < expected) {
        notes.push({ kind: 'standings-stale', expected, got: update?.round ?? 0 });
      } else {
        next = {
          ...next,
          completedRound: update.round,
          driverStandings: update.driverStandings,
          teamStandings: update.teamStandings,
        };
      }
    } catch (error) {
      notes.push({ kind: 'error', detail: describeError(error) });
    }
  }

  const changed = next !== snapshot || Object.keys(newTimed).length > 0;
  return {
    snapshot: changed ? { ...next, fetchedAt: now.toISOString() } : snapshot,
    timed: Object.keys(newTimed).length > 0 ? carryForwardTimedResults(newTimed, timed) : timed,
    changed,
    nothingPending: false,
    requests,
    notes,
  };
};

/**
 * 把補到的結果套進 Snapshot。正式結果一到就移除同場次的暫定結果；
 * 練習賽名次表的第一名摘要到 Session.leader。沒有任何變化時回傳同一個物件。
 */
const applyResults = (
  snapshot: Snapshot,
  round: number | null,
  official: OfficialResults,
  provisional: ProvisionalResults,
  newTimed: TimedResults,
): Snapshot => {
  if (round === null) return snapshot;
  let touched = false;

  const weekends = snapshot.weekends.map((weekend) => {
    if (weekend.round !== round) return weekend;

    const nextProvisional: ProvisionalResults = { ...weekend.provisional };
    const officialOf = { race: official.results, sprint: official.sprintResults, qualifying: official.qualifying };
    for (const kind of ['race', 'sprint', 'qualifying'] as const) {
      if (officialOf[kind]) delete nextProvisional[kind];
      else if (provisional[kind]) nextProvisional[kind] = provisional[kind];
    }

    const sessions = weekend.sessions.map((session) => {
      const first = newTimed[timedKey(round, session.kind)]?.[0];
      return first ? { ...session, leader: first } : session;
    });

    const nextWeekend: RaceWeekend = {
      ...weekend,
      sessions,
      results: official.results ?? weekend.results,
      sprintResults: official.sprintResults ?? weekend.sprintResults,
      qualifying: official.qualifying ?? weekend.qualifying,
    };
    if (Object.keys(nextProvisional).length > 0) nextWeekend.provisional = nextProvisional;
    else delete nextWeekend.provisional;

    if (JSON.stringify(nextWeekend) === JSON.stringify(weekend)) return weekend;
    touched = true;
    return nextWeekend;
  });

  return touched ? { ...snapshot, weekends } : snapshot;
};
