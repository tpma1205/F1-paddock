import {
  sessionOrder,
  type DriverStanding,
  type RaceWeekend,
  type Session,
  type SessionKind,
  type Snapshot,
  type TeamRef,
  type TeamStanding,
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
    if (startsAt) sessions.push({ kind, startsAt });
  }

  const raceStartsAt = toIso(race) ?? new Date(`${race.date}T00:00:00Z`).toISOString();
  sessions.push({ kind: 'race', startsAt: raceStartsAt });

  return sessions.sort(
    (a, b) =>
      Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
      sessionOrder(a.kind) - sessionOrder(b.kind),
  );
};

const toTeamRef = (raw: RawConstructor): TeamRef => ({
  id: raw.constructorId,
  name: raw.name,
  nationality: raw.nationality,
});

const toWeekend = (race: RawRace): RaceWeekend => ({
  round: Number(race.round),
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
});

const toDriverStanding = (raw: RawDriverStanding): DriverStanding => ({
  position: Number(raw.position),
  points: Number(raw.points),
  wins: Number(raw.wins),
  driver: {
    id: raw.Driver.driverId,
    code: raw.Driver.code ?? null,
    permanentNumber: raw.Driver.permanentNumber ?? null,
    givenName: raw.Driver.givenName,
    familyName: raw.Driver.familyName,
    nationality: raw.Driver.nationality,
  },
  teams: raw.Constructors.map(toTeamRef),
});

const toTeamStanding = (raw: RawConstructorStanding): TeamStanding => ({
  position: Number(raw.position),
  points: Number(raw.points),
  wins: Number(raw.wins),
  team: toTeamRef(raw.Constructor),
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

export interface NormaliseInput {
  races: RawRacesResponse;
  driverStandings: RawDriverStandingsResponse;
  teamStandings: RawTeamStandingsResponse;
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
  fetchedAt,
}: NormaliseInput): Snapshot => {
  const raceTable = races.MRData.RaceTable;
  const driverList = driverStandings.MRData.StandingsTable.StandingsLists[0];
  const teamList = teamStandings.MRData.StandingsTable.StandingsLists[0];

  const completedRound = Number(driverStandings.MRData.StandingsTable.round);

  return {
    season: assertValidSeason(raceTable.season),
    completedRound: Number.isFinite(completedRound) && completedRound > 0 ? completedRound : null,
    fetchedAt,
    weekends: raceTable.Races.map(toWeekend).sort((a, b) => a.round - b.round),
    driverStandings: (driverList?.DriverStandings ?? [])
      .map(toDriverStanding)
      .sort((a, b) => a.position - b.position),
    teamStandings: (teamList?.ConstructorStandings ?? [])
      .map(toTeamStanding)
      .sort((a, b) => a.position - b.position),
  };
};
