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
 * 一般週末沒有衝刺賽，不可假設固定五節（見 CONTEXT.md 的 Sprint Weekend）。
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
    code: raw.Driver.code ?? raw.Driver.familyName.slice(0, 3).toUpperCase(),
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
    season: raceTable.season,
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
