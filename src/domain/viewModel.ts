import {
  SESSION_DURATION_MINUTES,
  type CircuitView,
  type DriverSummary,
  type DriverView,
  type RaceWeekend,
  type Session,
  type SessionStatus,
  type SessionView,
  type Snapshot,
  type TeamView,
  type ViewModel,
  type WeekendView,
} from './types.ts';

const MINUTE_MS = 60_000;

/**
 * Session 的結束時間 —— **由慣例時長推導，API 不提供**。
 * 見 SESSION_DURATION_MINUTES 的說明。
 */
const endOf = (session: Session): number =>
  Date.parse(session.startsAt) + SESSION_DURATION_MINUTES[session.kind] * MINUTE_MS;

const statusOf = (session: Session, nowMs: number): SessionStatus => {
  if (endOf(session) <= nowMs) return 'finished';
  if (Date.parse(session.startsAt) <= nowMs) return 'live';
  return 'upcoming';
};

const toSessionView = (session: Session, nowMs: number): SessionView => ({
  kind: session.kind,
  startsAt: session.startsAt,
  endsAt: new Date(endOf(session)).toISOString(),
  status: statusOf(session, nowMs),
});

const toWeekendView = (weekend: RaceWeekend, nowMs: number): WeekendView => ({
  round: weekend.round,
  name: weekend.name,
  circuit: weekend.circuit,
  sessions: weekend.sessions.map((session) => toSessionView(session, nowMs)),
});

/**
 * 把車手歸到其**當前**車隊底下。
 *
 * 賽季中轉隊的車手在 Jolpica 會列出多支車隊，最後一支才是現況；
 * 只歸到那一支，避免同一人出現在兩隊的名單裡。
 */
const buildTeams = (snapshot: Snapshot): TeamView[] => {
  const driversByTeam = new Map<string, DriverSummary[]>();

  for (const standing of snapshot.driverStandings) {
    const currentTeam = standing.teams.at(-1);
    if (!currentTeam) continue;

    const summary: DriverSummary = {
      driver: standing.driver,
      position: standing.position,
      points: standing.points,
      wins: standing.wins,
    };
    driversByTeam.set(currentTeam.id, [...(driversByTeam.get(currentTeam.id) ?? []), summary]);
  }

  return snapshot.teamStandings.map((standing) => ({
    id: standing.team.id,
    name: standing.team.name,
    nationality: standing.team.nationality,
    colour: standing.team.colour,
    position: standing.position,
    points: standing.points,
    wins: standing.wins,
    drivers: (driversByTeam.get(standing.team.id) ?? []).sort((a, b) => a.position - b.position),
  }));
};

const buildDrivers = (snapshot: Snapshot): DriverView[] =>
  snapshot.driverStandings.map((standing) => ({
    driver: standing.driver,
    team: standing.teams.at(-1) ?? null,
    position: standing.position,
    points: standing.points,
    wins: standing.wins,
    podiums: standing.podiums,
  }));

/** 同一條賽道本季可能辦不只一站，以賽道為單位彙整。 */
const buildCircuits = (snapshot: Snapshot): CircuitView[] => {
  const byId = new Map<string, CircuitView>();

  for (const weekend of snapshot.weekends) {
    const existing = byId.get(weekend.circuit.id);
    const entry = { round: weekend.round, name: weekend.name };
    if (existing) {
      existing.weekends.push(entry);
    } else {
      byId.set(weekend.circuit.id, { circuit: weekend.circuit, weekends: [entry] });
    }
  }

  return [...byId.values()];
};

/**
 * 由 Snapshot 與**注入的**現在時間推導出畫面所需的一切。
 *
 * `now` 是顯式參數而非系統時鐘：Next Session 推導、Session 狀態與
 * Off-season 降級在真實世界一年只發生一次，唯有把時間當作輸入才測得到
 * （見 docs/adr/0004 與 docs/spec/0001 的測試接縫）。
 *
 * 本函式為純函式 —— 元件不得自行做任何時間判斷。
 */
export const buildViewModel = (snapshot: Snapshot, now: Date): ViewModel => {
  const nowMs = now.getTime();
  const teams = buildTeams(snapshot);
  const drivers = buildDrivers(snapshot);
  const circuits = buildCircuits(snapshot);

  // 尚未結束的最早一個場次即為 Next Session。
  // 用「尚未結束」而非「尚未開始」，是為了讓正在進行中的場次仍是聚焦對象，
  // 畫面才能顯示「進行中」而不是跳過它去倒數下一節。
  for (const weekend of snapshot.weekends) {
    const weekendView = toWeekendView(weekend, nowMs);
    const sessionView = weekendView.sessions.find((session) => session.status !== 'finished');

    // 整個週末都已結束 —— 往下一個 Round 找。
    if (!sessionView) continue;

    return {
      season: snapshot.season,
      fetchedAt: snapshot.fetchedAt,
      teams,
      drivers,
      circuits,
      focusWeekend: weekendView,
      nextSession: {
        weekend: weekendView,
        session: sessionView,
        msUntilStart: Math.max(0, Date.parse(sessionView.startsAt) - nowMs),
      },
      isOffSeason: false,
    };
  }

  // 本季所有場次都已結束 —— 進入 Off-season。
  return {
    season: snapshot.season,
    fetchedAt: snapshot.fetchedAt,
    teams,
    drivers,
    circuits,
    focusWeekend: null,
    nextSession: null,
    isOffSeason: true,
  };
};
