import {
  TIMED_KINDS,
  indexDriverNumbers,
  indexOpenF1Drivers,
  matchOpenF1Session,
  toTimedResults,
  type OpenF1DriverInfo,
  type RawOpenF1Driver,
  type RawOpenF1Session,
  type RawOpenF1SessionResult,
} from './openf1.ts';
import {
  isPodium,
  sessionOrder,
  type DriverRef,
  type DriverStanding,
  type QualifyingResult,
  type RaceResult,
  type RaceWeekend,
  type Session,
  type SessionKind,
  type Snapshot,
  type TeamRef,
  type TeamStanding,
  type TimedResults,
  timedKey,
} from '../domain/types.ts';

/**
 * Jolpica-F1（Ergast 繼任者）的**原始**回應形狀。
 *
 * 這些型別只存在於本檔案，用來把巢狀且欄位為字串的 API 回應轉成
 * 內部的 Snapshot。其他程式不應認得這裡的任何型別。
 */
interface RawLocation {
  lat: string;
  long: string;
  locality: string;
  country: string;
}

interface RawCircuit {
  circuitId: string;
  circuitName: string;
  Location: RawLocation;
}

interface RawSessionTime {
  date: string;
  time?: string;
}

interface RawRace extends RawSessionTime {
  season: string;
  round: string;
  raceName: string;
  Circuit: RawCircuit;
  FirstPractice?: RawSessionTime;
  SecondPractice?: RawSessionTime;
  ThirdPractice?: RawSessionTime;
  SprintQualifying?: RawSessionTime;
  Sprint?: RawSessionTime;
  Qualifying?: RawSessionTime;
}

interface RawDriver {
  driverId: string;
  code?: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
  /** YYYY-MM-DD */
  dateOfBirth?: string;
  nationality: string;
}

interface RawConstructor {
  constructorId: string;
  name: string;
  nationality: string;
}

interface RawDriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: RawDriver;
  Constructors: RawConstructor[];
}

interface RawConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: RawConstructor;
}

export interface RawRacesResponse {
  MRData: { RaceTable: { season: string; Races: RawRace[] } };
}

interface RawResult {
  position: string;
  positionText: string;
  points: string;
  grid: string;
  laps: string;
  status: string;
  Driver: RawDriver;
  Constructor: RawConstructor;
  Time?: { time: string };
  FastestLap?: { rank: string };
}

/**
 * `/results/`、`/sprint/`、`/qualifying/` 的回應（整季，分頁）。Jolpica 把
 * limit 上限鎖在 100，同一站可能跨頁，合併時必須依 round 分組。
 * 三個端點的差別只在 Races[] 內裝結果的欄位名。
 */
interface RawPagedResponse<Key extends string, Row> {
  MRData: {
    total: string;
    RaceTable: { season: string; Races: Array<RawRace & Record<Key, Row[]>> };
  };
}

export type RawResultsResponse = RawPagedResponse<'Results', RawResult>;
export type RawSprintResponse = RawPagedResponse<'SprintResults', RawResult>;

interface RawQualifyingResult {
  position: string;
  Driver: RawDriver;
  Constructor: RawConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export type RawQualifyingResponse = RawPagedResponse<'QualifyingResults', RawQualifyingResult>;

export interface RawDriverStandingsResponse {
  MRData: {
    StandingsTable: {
      season: string;
      round: string;
      StandingsLists: { DriverStandings: RawDriverStanding[] }[];
    };
  };
}

export interface RawTeamStandingsResponse {
  MRData: {
    StandingsTable: {
      season: string;
      round: string;
      StandingsLists: { ConstructorStandings: RawConstructorStanding[] }[];
    };
  };
}

/**
 * 原始回應的欄位名 → 內部的 SessionKind。
 *
 * 正賽不在此表中 —— 它的時間放在 RawRace 的頂層 date/time。
 */
const SESSION_FIELDS: ReadonlyArray<[keyof RawRace, SessionKind]> = [
  ['FirstPractice', 'fp1'],
  ['SecondPractice', 'fp2'],
  ['ThirdPractice', 'fp3'],
  ['SprintQualifying', 'sprintQualifying'],
  ['Sprint', 'sprint'],
  ['Qualifying', 'qualifying'],
];

/** 合併 API 分開提供的日期與時間為 ISO 8601 UTC 字串。 */
const toIso = (slot: RawSessionTime): string | null => {
  if (!slot.time) return null;
  const parsed = new Date(`${slot.date}T${slot.time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/**
 * 取出一個 Race Weekend 的場次。
 *
 * **場次組成一律由資料決定** —— Sprint Weekend 沒有 FP2／FP3，
 * 一般週末沒有衝刺賽，不可假設固定五個場次（見 CONTEXT.md 的 Sprint Weekend）。
 *
 * 正賽與其他場次對「缺少時間」的處理**刻意不同**：
 *
 * - 練習賽／排位／衝刺賽缺少時間時**捨棄該場次**。捏一個午夜 UTC 出來會讓
 *   畫面顯示一個看似真實、實際錯誤的開賽時間，比不顯示更糟。
 * - 正賽缺少時間時**退回當日午夜 UTC**。Race Weekend 必須至少有正賽，
 *   捨棄它會讓整站少掉一個站次；日期本身仍是正確的資訊。
 *
 * 當前球季的所有場次都有時間，這條路徑只在資料異常時才會走到。
 */
const toSessions = (race: RawRace): Session[] => {
  const sessions: Session[] = [];

  for (const [field, kind] of SESSION_FIELDS) {
    const slot = race[field];
    if (!slot || typeof slot !== 'object') continue;
    const startsAt = toIso(slot as RawSessionTime);
    if (startsAt) sessions.push({ kind, startsAt, leader: null });
  }

  const raceStartsAt = toIso(race) ?? new Date(`${race.date}T00:00:00Z`).toISOString();
  sessions.push({ kind: 'race', startsAt: raceStartsAt, leader: null });

  return sessions.sort(
    (a, b) =>
      Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
      sessionOrder(a.kind) - sessionOrder(b.kind),
  );
};

type ColourByTeam = ReadonlyMap<string, string>;

const toTeamRef = (raw: RawConstructor, colours: ColourByTeam): TeamRef => ({
  id: raw.constructorId,
  name: raw.name,
  nationality: raw.nationality,
  colour: colours.get(raw.constructorId) ?? null,
});

/**
 * 由車手推導每支車隊的代表色。
 *
 * 一位車手的 OpenF1 代表色，歸給他在 Jolpica **最後一支**車隊 —— 賽季中
 * 轉隊的車手會有多支車隊，最後一支才是現況。同隊兩位車手的顏色相同，
 * 先到先得。沒有任何車手能對上的車隊（例如兩位都不在最新 session）
 * 就沒有顏色，由畫面降級處理。
 */
const deriveTeamColours = (
  standings: ReadonlyArray<RawDriverStanding>,
  openF1: ReadonlyMap<string, OpenF1DriverInfo>,
): ColourByTeam => {
  const colours = new Map<string, string>();

  for (const standing of standings) {
    const code = standing.Driver.code;
    const team = standing.Constructors.at(-1);
    if (!code || !team) continue;

    const colour = openF1.get(code)?.teamColour;
    if (colour && !colours.has(team.constructorId)) colours.set(team.constructorId, colour);
  }

  return colours;
};

/** driverId → 出道球季（見 DriverRef.debutSeason）。 */
export type Debuts = Readonly<Record<string, string | null>>;

const toDriverRef = (raw: RawDriver, openF1: ReadonlyMap<string, OpenF1DriverInfo>, debuts: Debuts): DriverRef => ({
  id: raw.driverId,
  code: raw.code ?? null,
  permanentNumber: raw.permanentNumber ?? null,
  givenName: raw.givenName,
  familyName: raw.familyName,
  nationality: raw.nationality,
  headshotUrl: (raw.code && openF1.get(raw.code)?.headshotUrl) || null,
  dateOfBirth: raw.dateOfBirth ?? null,
  debutSeason: debuts[raw.driverId] ?? null,
});

const CLASSIFIED = /^\d+$/;

const toRaceResult = (raw: RawResult): RaceResult => ({
  position: Number(raw.position),
  positionText: raw.positionText,
  classified: CLASSIFIED.test(raw.positionText),
  points: Number(raw.points),
  status: raw.status,
  laps: Number(raw.laps),
  grid: Number(raw.grid),
  time: raw.Time?.time ?? null,
  fastestLap: raw.FastestLap?.rank === '1',
  driverId: raw.Driver.driverId,
  teamId: raw.Constructor.constructorId,
});

const toQualifyingResult = (raw: RawQualifyingResult): QualifyingResult => ({
  position: Number(raw.position),
  driverId: raw.Driver.driverId,
  teamId: raw.Constructor.constructorId,
  q1: raw.Q1 ?? null,
  q2: raw.Q2 ?? null,
  q3: raw.Q3 ?? null,
});

/**
 * 把分頁的回應依 round 合併。Jolpica 每頁最多 100 筆，一站 22 筆，
 * 所以同一站常被切在兩頁 —— 不合併的話那一站會少掉一半的車手。
 * 三個端點（正賽／衝刺賽／排位賽）共用這條，只差結果欄位名與轉換函式。
 */
const groupByRound = <Key extends string, Row, Out extends { position: number }>(
  pages: ReadonlyArray<RawPagedResponse<Key, Row>> | undefined,
  key: Key,
  toRow: (raw: Row) => Out,
): ReadonlyMap<number, Out[]> | null => {
  if (!pages || pages.length === 0) return null;
  const byRound = new Map<number, Out[]>();

  for (const page of pages) {
    for (const race of page.MRData.RaceTable.Races) {
      const round = Number(race.round);
      const existing = byRound.get(round) ?? [];
      byRound.set(round, [...existing, ...race[key].map(toRow)]);
    }
  }

  for (const rows of byRound.values()) rows.sort((a, b) => a.position - b.position);
  return byRound;
};

interface PerRound {
  results: ReadonlyMap<number, RaceResult[]> | null;
  sprints: ReadonlyMap<number, RaceResult[]> | null;
  qualifying: ReadonlyMap<number, QualifyingResult[]> | null;
}

const toWeekend =
  (perRound: PerRound) =>
  (race: RawRace): RaceWeekend => {
    const round = Number(race.round);
    return {
      round,
      name: race.raceName,
      circuit: {
        id: race.Circuit.circuitId,
        name: race.Circuit.circuitName,
        locality: race.Circuit.Location.locality,
        country: race.Circuit.Location.country,
        lat: Number(race.Circuit.Location.lat),
        long: Number(race.Circuit.Location.long),
      },
      sessions: toSessions(race),
      results: perRound.results?.get(round) ?? null,
      sprintResults: perRound.sprints?.get(round) ?? null,
      qualifying: perRound.qualifying?.get(round) ?? null,
    };
  };

/**
 * 由完整賽果統計每位車手的頒獎台次數（有正式名次且在前三）。
 * 回傳 null（而非空 Map）代表賽果資料未提供，讓畫面能區分「零次」與「不知道」。
 */
const tallyPodiums = (
  resultsByRound: ReadonlyMap<number, RaceResult[]> | null,
): ReadonlyMap<string, number> | null => {
  if (resultsByRound === null) return null;

  const tally = new Map<string, number>();
  for (const results of resultsByRound.values()) {
    for (const result of results) {
      if (!isPodium(result)) continue;
      tally.set(result.driverId, (tally.get(result.driverId) ?? 0) + 1);
    }
  }
  return tally;
};

const toDriverStanding =
  (
    colours: ColourByTeam,
    openF1: ReadonlyMap<string, OpenF1DriverInfo>,
    podiums: ReadonlyMap<string, number> | null,
    debuts: Debuts,
  ) =>
  (raw: RawDriverStanding): DriverStanding => ({
    position: Number(raw.position),
    points: Number(raw.points),
    wins: Number(raw.wins),
    podiums: podiums === null ? null : (podiums.get(raw.Driver.driverId) ?? 0),
    driver: toDriverRef(raw.Driver, openF1, debuts),
    teams: raw.Constructors.map((team) => toTeamRef(team, colours)),
  });

const toTeamStanding =
  (colours: ColourByTeam) =>
  (raw: RawConstructorStanding): TeamStanding => ({
    position: Number(raw.position),
    points: Number(raw.points),
    wins: Number(raw.wins),
    team: toTeamRef(raw.Constructor, colours),
  });

/**
 * Season 必須是四位數年份。
 *
 * 這是領域不變量，但驗證的位置更關鍵：season 會成為快照的**檔名**
 * （`snapshots/<season>.json`）與索引鍵，而它來自第三方回應。抓取腳本在
 * GitHub Actions 中以 repo 寫入權限執行，若 season 挾帶路徑片段就能寫到
 * checkout 的任意位置。在第三方資料轉為內部資料的邊界上擋掉，比在每個
 * 使用點各自防禦可靠。
 */
const assertValidSeason = (season: string): string => {
  if (!/^\d{4}$/.test(season)) {
    throw new Error(`API 回傳的球季格式不合法：${JSON.stringify(season)}（預期四位數年份）`);
  }
  return season;
};

export interface OpenF1SessionsInput {
  sessions: ReadonlyArray<RawOpenF1Session>;
  /** 各場次的名次表，以 session_key 為鍵；沒抓到的場次不放。 */
  results: Readonly<Record<number, ReadonlyArray<RawOpenF1SessionResult>>>;
  /** 車手清單（跨 meeting），供車號對縮寫。 */
  drivers: ReadonlyArray<Pick<RawOpenF1Driver, 'driver_number' | 'name_acronym'>>;
}

/**
 * OpenF1 的名次表 → TimedResults sidecar。與 normaliseSeason 分開：sidecar
 * 另存一檔、可獨立 carry-forward；核心快照只從它摘要每個場次的第一名。
 */
export const normaliseTimedResults = (
  { races, driverStandings }: Pick<NormaliseInput, 'races' | 'driverStandings'>,
  openF1: OpenF1SessionsInput,
): TimedResults => {
  const standings = driverStandings.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  const numberToCode = indexDriverNumbers(openF1.drivers);
  const codeToDriverId = new Map(
    standings.flatMap((s) => (s.Driver.code ? [[s.Driver.code, s.Driver.driverId] as const] : [])),
  );
  const timed: TimedResults = {};
  for (const race of races.MRData.RaceTable.Races) {
    const round = Number(race.round);
    for (const session of toSessions(race)) {
      if (!TIMED_KINDS.has(session.kind)) continue;
      const key = matchOpenF1Session(session, openF1.sessions);
      const rows = key === null ? undefined : openF1.results[key];
      if (rows) timed[timedKey(round, session.kind)] = toTimedResults(rows, numberToCode, codeToDriverId);
    }
  }
  return timed;
};

/** 把 sidecar 的第一名摘要到核心快照的 Session 上。 */
const attachLeaders = (weekends: RaceWeekend[], timed: TimedResults): void => {
  for (const weekend of weekends) {
    for (const session of weekend.sessions) {
      const first = timed[timedKey(weekend.round, session.kind)]?.[0];
      if (first) session.leader = first;
    }
  }
};

export interface NormaliseInput {
  races: RawRacesResponse;
  driverStandings: RawDriverStandingsResponse;
  teamStandings: RawTeamStandingsResponse;
  /** 可省略 —— OpenF1 失效時仍能產出沒有顏色與照片的快照。 */
  openF1Drivers?: ReadonlyArray<RawOpenF1Driver>;
  /** 整季賽果的分頁回應；可省略，屆時 results 與頒獎台次數皆為 null。 */
  results?: ReadonlyArray<RawResultsResponse>;
  /** 整季衝刺賽的分頁回應；可省略。 */
  sprints?: ReadonlyArray<RawSprintResponse>;
  /** 整季排位賽的分頁回應；可省略。 */
  qualifying?: ReadonlyArray<RawQualifyingResponse>;
  /** 練習賽／衝刺排位的名次表 sidecar（見 normaliseTimedResults）；可省略，屆時 Session.leader 皆為 null。 */
  timedResults?: TimedResults;
  /** 各車手的出道球季；可省略，屆時 debutSeason 皆為 null。 */
  debuts?: Debuts;
  fetchedAt: string;
}

/**
 * 把三份原始回應正規化為一份 Snapshot。
 *
 * **球季來自回應本身，絕不寫死年份** —— 抓取端使用 `/current/`，
 * 跨年時它會自行指向新球季（見 docs/adr/0004）。
 */
export const normaliseSeason = ({
  races,
  driverStandings,
  teamStandings,
  openF1Drivers = [],
  results,
  sprints,
  qualifying,
  timedResults,
  debuts = {},
  fetchedAt,
}: NormaliseInput): Snapshot => {
  const raceTable = races.MRData.RaceTable;
  const rawDrivers = driverStandings.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  const rawTeams = teamStandings.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];

  const openF1 = indexOpenF1Drivers(openF1Drivers);
  const colours = deriveTeamColours(rawDrivers, openF1);
  const perRound: PerRound = {
    results: groupByRound(results, 'Results', toRaceResult),
    sprints: groupByRound(sprints, 'SprintResults', toRaceResult),
    qualifying: groupByRound(qualifying, 'QualifyingResults', toQualifyingResult),
  };
  const podiums = tallyPodiums(perRound.results);
  const completedRound = Number(driverStandings.MRData.StandingsTable.round);

  const weekends = raceTable.Races.map(toWeekend(perRound)).sort((a, b) => a.round - b.round);
  if (timedResults) attachLeaders(weekends, timedResults);

  return {
    season: assertValidSeason(raceTable.season),
    completedRound: Number.isFinite(completedRound) && completedRound > 0 ? completedRound : null,
    fetchedAt,
    weekends,
    driverStandings: rawDrivers
      .map(toDriverStanding(colours, openF1, podiums, debuts))
      .sort((a, b) => a.position - b.position),
    teamStandings: rawTeams.map(toTeamStanding(colours)).sort((a, b) => a.position - b.position),
  };
};
