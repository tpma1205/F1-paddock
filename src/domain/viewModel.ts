import {
  isPodium,
  type BattleSide,
  type CircuitView,
  type DriverRef,
  type DriverSummary,
  type DriverView,
  type Highlight,
  type PointsProgression,
  type QualifyingResult,
  type RaceWeekend,
  type SeasonHighlights,
  type TeammateBattle,
  type Session,
  type SessionLeader,
  type SessionStatus,
  type SessionView,
  type Snapshot,
  type TeamRef,
  type TeamView,
  type TimedResult,
  type TimedResultView,
  type ViewModel,
  type WeekendView,
} from './types.ts';

/** 快照中的賽果只存 ID，這裡解析回車手與車隊參照。 */
interface RefIndex {
  drivers: ReadonlyMap<string, DriverRef>;
  teams: ReadonlyMap<string, TeamRef>;
}

const indexRefs = (snapshot: Snapshot): RefIndex => {
  const drivers = new Map<string, DriverRef>();
  const teams = new Map<string, TeamRef>();

  for (const standing of snapshot.driverStandings) {
    drivers.set(standing.driver.id, standing.driver);
    for (const team of standing.teams) teams.set(team.id, team);
  }
  for (const standing of snapshot.teamStandings) teams.set(standing.team.id, standing.team);

  return { drivers, teams };
};

/**
 * 找不到參照時退回一個只有 ID 的最小物件，畫面仍能顯示 —— 這只會在
 * 資料不一致時發生（例如賽果有某位車手、積分榜卻沒有），不該讓整頁失效。
 */
const fallbackDriver = (id: string): DriverRef => ({
  id,
  code: null,
  permanentNumber: null,
  givenName: '',
  familyName: id,
  nationality: '',
  headshotUrl: null,
  dateOfBirth: null,
  debutSeason: null,
});

const fallbackTeam = (id: string): TeamRef => ({ id, name: id, nationality: '', colour: null });

import { endOf, seasonFinished } from './season.ts';
import { formatGapMs, formatLapMs } from './laptime.ts';

const statusOf = (session: Session, nowMs: number): SessionStatus => {
  if (endOf(session) <= nowMs) return 'finished';
  if (Date.parse(session.startsAt) <= nowMs) return 'live';
  return 'upcoming';
};

/** 排位賽的最快圈：跑到哪一節就是哪一節的時間。 */
const qualifyingBest = (q: QualifyingResult): string | null => q.q3 ?? q.q2 ?? q.q1;

const leaderFrom = (driver: DriverRef | null, driverNumber: number | null, time: string | null): SessionLeader => ({
  code: driver?.code ?? (driverNumber === null ? '—' : `#${driverNumber}`),
  driver,
  time,
});

/**
 * 已結束場次的第一名。每種場次的 Result 住在不同地方 —— 練習賽與衝刺排位
 * 摘要在 Session 上、排位賽／正賽／衝刺賽在 Race Weekend 上 —— 這裡把它們
 * 收成同一個形狀。
 */
const leaderOf = (session: Session, weekend: RaceWeekend, refs: RefIndex): SessionLeader | null => {
  const driverOf = (id: string | null): DriverRef | null => (id === null ? null : (refs.drivers.get(id) ?? null));
  switch (session.kind) {
    case 'fp1':
    case 'fp2':
    case 'fp3':
    case 'sprintQualifying': {
      const first = session.leader;
      return first
        ? leaderFrom(driverOf(first.driverId), first.driverNumber, first.bestLapMs === null ? null : formatLapMs(first.bestLapMs))
        : null;
    }
    case 'qualifying': {
      const first = weekend.qualifying?.[0];
      return first ? leaderFrom(driverOf(first.driverId), null, qualifyingBest(first)) : null;
    }
    case 'sprint': {
      const first = weekend.sprintResults?.[0];
      return first ? leaderFrom(driverOf(first.driverId), null, null) : null;
    }
    case 'race': {
      const first = weekend.results?.[0];
      return first ? leaderFrom(driverOf(first.driverId), null, null) : null;
    }
  }
};

const toSessionView = (session: Session, weekend: RaceWeekend, nowMs: number, refs: RefIndex): SessionView => {
  const status = statusOf(session, nowMs);
  return {
    kind: session.kind,
    startsAt: session.startsAt,
    endsAt: new Date(endOf(session)).toISOString(),
    status,
    // 未結束的場次不該有第一名 —— 就算資料有（改期後的殘留），也不顯示
    leader: status === 'finished' ? leaderOf(session, weekend, refs) : null,
  };
};

/**
 * sidecar 的名次表 → 已解析車手與車隊、格式化好時間的列。單站頁在載入
 * sidecar 之後呼叫；解析用的是 View Model 的車手清單，不需要 Snapshot。
 */
export const toTimedResultViews = (rows: ReadonlyArray<TimedResult>, viewModel: ViewModel): TimedResultView[] =>
  rows.map((row) => {
    const entry = row.driverId === null ? undefined : viewModel.drivers.find((d) => d.driver.id === row.driverId);
    return {
      position: row.position,
      driverNumber: row.driverNumber,
      driver: entry?.driver ?? null,
      team: entry?.team ?? null,
      bestLap: row.bestLapMs === null ? null : formatLapMs(row.bestLapMs),
      gap: row.gapMs === null ? '' : formatGapMs(row.gapMs),
      laps: row.laps,
    };
  });

const toWeekendView = (weekend: RaceWeekend, nowMs: number, refs: RefIndex): WeekendView => {
  const sessions = weekend.sessions.map((session) => toSessionView(session, weekend, nowMs, refs));
  // 每個 Race Weekend 必有正賽（見 jolpica.ts 的 toSessions）；找不到時視為未開始。
  const race = sessions.find((session) => session.kind === 'race');

  const resolve = <T extends { driverId: string; teamId: string }>(row: T) => ({
    ...row,
    driver: refs.drivers.get(row.driverId) ?? fallbackDriver(row.driverId),
    team: refs.teams.get(row.teamId) ?? fallbackTeam(row.teamId),
  });
  const results = weekend.results?.map(resolve) ?? null;
  const sprintResults = weekend.sprintResults?.map(resolve) ?? null;
  const qualifying = weekend.qualifying?.map((q) => ({ ...resolve(q), best: qualifyingBest(q) })) ?? null;

  // sessions 依時間排序，最後一個已結束的就是最新的
  const latestFinished = [...sessions].reverse().find((s) => s.status === 'finished');

  return {
    round: weekend.round,
    name: weekend.name,
    circuit: weekend.circuit,
    sessions,
    raceStatus: race?.status ?? 'upcoming',
    msUntilRace: race ? Math.max(0, Date.parse(race.startsAt) - nowMs) : 0,
    results,
    sprintResults,
    qualifying,
    podium: (results ?? []).filter(isPodium).slice(0, 3),
    latestFinishedSession: latestFinished?.kind ?? null,
  };
};

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
      podiums: standing.podiums,
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

/** 足歲：以 UTC 日期比較，生日當天就算滿。 */
const ageAt = (dateOfBirth: string, nowMs: number): number => {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  const now = new Date(nowMs);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
};

const buildDrivers = (snapshot: Snapshot, nowMs: number): DriverView[] =>
  snapshot.driverStandings.map((standing) => {
    const { driver } = standing;
    // 第 N 季以積分那一季計 —— 跨年後 standings 仍是上一季時，資歷不會提前 +1
    const seasonNumber = driver.debutSeason === null ? null : Number(snapshot.season) - Number(driver.debutSeason) + 1;
    return {
      driver,
      team: standing.teams.at(-1) ?? null,
      position: standing.position,
      points: standing.points,
      wins: standing.wins,
      podiums: standing.podiums,
      age: driver.dateOfBirth === null ? null : ageAt(driver.dateOfBirth, nowMs),
      seasonNumber,
      isRookie: seasonNumber === 1,
    };
  });

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
 * 積分走勢：每位車手在每個已完成 Round 後的累積積分。
 *
 * 由正賽 + 衝刺賽積分推導，而非另外抓逐站積分榜 —— 實測與官方積分榜
 * 23/23 位車手完全吻合，且少 12 次請求。只計「有賽果」的 Round。
 */
const buildProgression = (snapshot: Snapshot): PointsProgression => {
  const completed = snapshot.weekends.filter((w) => w.results !== null);
  const rounds = completed.map((w) => w.round);

  const running = new Map<string, number>();
  const cumulativeById = new Map<string, number[]>();

  for (const weekend of completed) {
    const gained = new Map<string, number>();
    for (const r of weekend.results ?? []) gained.set(r.driverId, (gained.get(r.driverId) ?? 0) + r.points);
    for (const r of weekend.sprintResults ?? []) gained.set(r.driverId, (gained.get(r.driverId) ?? 0) + r.points);

    // 每位已知車手都要在每一輪有一個點 —— 沒出賽的那一輪維持原值，線才不會斷。
    for (const standing of snapshot.driverStandings) {
      const id = standing.driver.id;
      const next = (running.get(id) ?? 0) + (gained.get(id) ?? 0);
      running.set(id, next);
      cumulativeById.set(id, [...(cumulativeById.get(id) ?? []), next]);
    }
  }

  // 同隊第幾位：積分榜順序在前者為 0（實線），其後為 1（虛線）。
  const seenPerTeam = new Map<string, number>();

  const series = snapshot.driverStandings.map((standing) => {
    const team = standing.teams.at(-1) ?? null;
    const teamKey = team?.id ?? '';
    const teammateIndex = seenPerTeam.get(teamKey) ?? 0;
    seenPerTeam.set(teamKey, teammateIndex + 1);

    return {
      driver: standing.driver,
      team,
      cumulative: cumulativeById.get(standing.driver.id) ?? rounds.map(() => 0),
      teammateIndex,
    };
  });

  return { rounds, series };
};

/**
 * 隊友對決：同隊兩位車手在排位與正賽的正面比較。
 *
 * 只算**兩人都參與**的場次 —— 一方缺席（未出賽、退賽）的那場不計入，
 * 否則缺席的一方會被記成「輸」。排位以名次比；正賽以有正式名次者的名次比。
 */
const buildBattles = (snapshot: Snapshot, teams: TeamView[]): TeammateBattle[] =>
  teams.flatMap((team) => {
    const [first, second] = team.drivers;
    if (!first || !second) return [];

    const sides: [BattleSide, BattleSide] = [first, second].map((entry) => ({
      driver: entry.driver,
      points: entry.points,
      wins: entry.wins,
      podiums: entry.podiums,
      qualifyingAhead: 0,
      raceAhead: 0,
    })) as [BattleSide, BattleSide];

    let qualifyingContests = 0;
    let raceContests = 0;

    for (const weekend of snapshot.weekends) {
      const firstQualifying = weekend.qualifying?.find((q) => q.driverId === first.driver.id);
      const secondQualifying = weekend.qualifying?.find((q) => q.driverId === second.driver.id);
      if (firstQualifying && secondQualifying) {
        qualifyingContests += 1;
        if (firstQualifying.position < secondQualifying.position) sides[0].qualifyingAhead += 1;
        else sides[1].qualifyingAhead += 1;
      }

      const firstRace = weekend.results?.find((r) => r.driverId === first.driver.id && r.classified);
      const secondRace = weekend.results?.find((r) => r.driverId === second.driver.id && r.classified);
      if (firstRace && secondRace) {
        raceContests += 1;
        if (firstRace.position < secondRace.position) sides[0].raceAhead += 1;
        else sides[1].raceAhead += 1;
      }
    }

    return [{ teamId: team.id, a: sides[0], b: sides[1], qualifyingContests, raceContests }];
  });

/**
 * 從「車手 → 次數」取出最高者 —— **平手時全部回傳**，不藏掉並列者。
 * 沒有任何資料（全為 0）時為 null。
 */
const topOf = (
  counts: ReadonlyMap<string, number>,
  refs: RefIndex,
  teamOf: ReadonlyMap<string, TeamRef | null>,
): Highlight | null => {
  const max = Math.max(0, ...counts.values());
  if (max <= 0) return null;

  const holders = [...counts]
    .filter(([, count]) => count === max)
    .flatMap(([driverId]) => {
      const driver = refs.drivers.get(driverId);
      return driver ? [{ driver, team: teamOf.get(driverId) ?? null }] : [];
    });

  return holders.length > 0 ? { holders, count: max } : null;
};

/**
 * 本季數據亮點。每一項都可能是 null —— 賽季初無資料時畫面該顯示「尚無」，
 * 而不是硬湊一個 0 次的贏家。
 */
const buildHighlights = (snapshot: Snapshot, refs: RefIndex): SeasonHighlights => {
  const teamOf = new Map<string, TeamRef | null>(
    snapshot.driverStandings.map((s) => [s.driver.id, s.teams.at(-1) ?? null]),
  );
  const wins = new Map(snapshot.driverStandings.map((s) => [s.driver.id, s.wins]));
  const podiums = new Map(snapshot.driverStandings.map((s) => [s.driver.id, s.podiums ?? 0]));
  const poles = new Map<string, number>();
  const retirements = new Map<string, number>();

  for (const weekend of snapshot.weekends) {
    const pole = weekend.qualifying?.find((q) => q.position === 1);
    if (pole) poles.set(pole.driverId, (poles.get(pole.driverId) ?? 0) + 1);
    for (const r of weekend.results ?? []) {
      if (!r.classified) retirements.set(r.driverId, (retirements.get(r.driverId) ?? 0) + 1);
    }
  }

  return {
    mostWins: topOf(wins, refs, teamOf),
    mostPoles: topOf(poles, refs, teamOf),
    mostPodiums: topOf(podiums, refs, teamOf),
    mostRetirements: topOf(retirements, refs, teamOf),
  };
};

const hasStandings = (snapshot: Snapshot): boolean => snapshot.driverStandings.length > 0;

/**
 * 從所有球季的快照中決定「賽程用哪一季、積分用哪一季」。
 *
 * - **賽程季**：最舊的「尚未結束」的球季。球季進行中時就是本季（即使下一季
 *   賽程已公布也不提前切換）；本季最後一場結束後自動變成下一季；全部都
 *   結束（下一季賽程尚未公布）時退回最新一季，進入 Off-season。
 * - **積分季**：賽程季本身有積分就用它；新球季剛開始還沒有積分時，回退到
 *   最近一個有積分的舊球季，畫面標示年份。
 */
const selectSeasons = (
  snapshots: ReadonlyArray<Snapshot>,
  nowMs: number,
): { schedule: Snapshot; standings: Snapshot } => {
  const sorted = [...snapshots].sort((a, b) => a.season.localeCompare(b.season));
  const newest = sorted.at(-1);
  if (!newest) throw new Error('沒有任何快照 —— 請先執行 `npm run fetch`。');

  const schedule = sorted.find((s) => !seasonFinished(s, nowMs)) ?? newest;
  const standings = hasStandings(schedule)
    ? schedule
    : ([...sorted].reverse().find((s) => s.season < schedule.season && hasStandings(s)) ?? schedule);

  return { schedule, standings };
};

/**
 * 由所有球季的 Snapshot 與**注入的**現在時間推導出畫面所需的一切。
 *
 * `now` 是顯式參數而非系統時鐘：Next Session 推導、Session 狀態、換季與
 * Off-season 降級在真實世界一年只發生一次，唯有把時間當作輸入才測得到
 * （見 docs/adr/0004 與 docs/spec/0001 的測試接縫）。
 *
 * 本函式為純函式 —— 元件不得自行做任何時間判斷。
 */
export const buildViewModel = (snapshots: ReadonlyArray<Snapshot>, now: Date): ViewModel => {
  const nowMs = now.getTime();
  const { schedule, standings } = selectSeasons(snapshots, nowMs);

  // 賽果的參照由「積分季」解析 —— 賽程季剛開始時還沒有車手名單。
  const refs = indexRefs(standings);
  const weekends = schedule.weekends.map((weekend) => toWeekendView(weekend, nowMs, refs));

  const teams = buildTeams(standings);
  const shared = {
    season: schedule.season,
    standingsSeason: standings.season,
    standingsAreFinal: standings !== schedule || seasonFinished(standings, nowMs),
    fetchedAt: schedule.fetchedAt,
    weekends,
    teams,
    drivers: buildDrivers(standings, nowMs),
    circuits: buildCircuits(schedule),
    progression: buildProgression(standings),
    battles: buildBattles(standings, teams),
    highlights: buildHighlights(standings, refs),
  };

  // 尚未結束的最早一個場次即為 Next Session。
  // 用「尚未結束」而非「尚未開始」，是為了讓正在進行中的場次仍是聚焦對象，
  // 畫面才能顯示「進行中」而不是跳過它去倒數下一節。
  for (const weekend of weekends) {
    const session = weekend.sessions.find((candidate) => candidate.status !== 'finished');
    // 整個週末都已結束 —— 往下一個 Round 找。
    if (!session) continue;

    return {
      ...shared,
      focusWeekend: weekend,
      nextSession: {
        weekend,
        session,
        msUntilStart: Math.max(0, Date.parse(session.startsAt) - nowMs),
      },
      isOffSeason: false,
    };
  }

  // 本季所有場次都已結束 —— 進入 Off-season。
  return { ...shared, focusWeekend: null, nextSession: null, isOffSeason: true };
};
