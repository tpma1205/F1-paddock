import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshot, fixtureTimedResults } from './__fixtures__/buildFixtureSnapshot.ts';
import resultsPage1 from './__fixtures__/jolpica-results-page1.json' with { type: 'json' };
import resultsPage2 from './__fixtures__/jolpica-results-page2.json' with { type: 'json' };
import resultsPage3 from './__fixtures__/jolpica-results-page3.json' with { type: 'json' };
import qualifyingPage1 from './__fixtures__/jolpica-qualifying-page1.json' with { type: 'json' };
import qualifyingPage2 from './__fixtures__/jolpica-qualifying-page2.json' with { type: 'json' };
import qualifyingPage3 from './__fixtures__/jolpica-qualifying-page3.json' with { type: 'json' };
import driverStandings from './__fixtures__/jolpica-driver-standings.json' with { type: 'json' };
import teamStandings from './__fixtures__/jolpica-constructor-standings.json' with { type: 'json' };
import meetingDrivers from './__fixtures__/openf1-drivers-meeting.json' with { type: 'json' };
import { HttpError, MAX_REQUESTS_PER_REFRESH, refreshResults, type RefreshOutcome } from './liveRefresh.ts';
import { timedKey, type Snapshot, type TimedResults } from '../domain/types.ts';

const full = buildFixtureSnapshot();
const italyFull = full.weekends.find((w) => w.round === 13)!;
const raceStart = Date.parse(italyFull.sessions.find((s) => s.kind === 'race')!.startsAt);
/** 正賽開始 5 小時後 —— 所有場次都到期。 */
const NOW = new Date(raceStart + 5 * 3_600_000);

/** 義大利站結果還沒進快照的狀態；練習賽名次表全齊（避免干擾）。 */
const stale = (): Snapshot => ({
  ...full,
  completedRound: 12,
  fetchedAt: '2026-09-10T00:00:00.000Z',
  weekends: full.weekends.map((w) => (w.round === 13 ? { ...w, results: null, qualifying: null } : w)),
});
const timedFull = (): TimedResults => {
  const timed = fixtureTimedResults();
  const fp1 = timed[timedKey(13, 'fp1')]!;
  return { ...timed, [timedKey(13, 'fp2')]: fp1, [timedKey(13, 'fp3')]: fp1 };
};

/** 取 fixture 分頁回應裡某一站，組成 Jolpica 單站端點的回應形狀。 */
const onlyRound = (pages: ReadonlyArray<{ MRData: { RaceTable: { Races: Array<{ round: string }> } } }>, round: string) => ({
  MRData: {
    total: '1',
    RaceTable: { season: '2026', Races: pages.flatMap((p) => p.MRData.RaceTable.Races).filter((r) => r.round === round) },
  },
});
const empty = { MRData: { total: '0', RaceTable: { season: '2026', Races: [] } } };

const jolpicaRace = onlyRound([resultsPage1, resultsPage2, resultsPage3], '13');
const jolpicaQuali = onlyRound([qualifyingPage1, qualifyingPage2, qualifyingPage3], '13');

type Route = (url: string) => unknown | Promise<unknown>;
/** 假的 fetchJson：依網址片段分派，並記錄所有請求。 */
const fakeNet = (routes: Array<[string, Route]>) => {
  const calls: string[] = [];
  const fetchJson = async (url: string): Promise<unknown> => {
    calls.push(url);
    const hit = routes.find(([fragment]) => url.includes(fragment));
    if (!hit) throw new HttpError(404, url);
    return hit[1](url);
  };
  return { calls, fetchJson };
};

const raceSession = { session_key: 9001, meeting_key: 77, session_name: 'Race', date_start: italyFull.sessions.find((s) => s.kind === 'race')!.startsAt };
const qualiSession = { session_key: 9002, meeting_key: 77, session_name: 'Qualifying', date_start: italyFull.sessions.find((s) => s.kind === 'qualifying')!.startsAt };
const openF1RaceRows = [
  { position: 1, driver_number: 16, number_of_laps: 53, dnf: false, dns: false, dsq: false, duration: 5400.5, gap_to_leader: 0 },
  { position: 2, driver_number: 1, number_of_laps: 53, dnf: false, dns: false, dsq: false, duration: 5403, gap_to_leader: 2.5 },
];

const run = (
  net: ReturnType<typeof fakeNet>,
  snapshot = stale(),
  timed = timedFull(),
  probeReachable?: (url: string) => Promise<boolean>,
): Promise<RefreshOutcome> =>
  refreshResults({ snapshot, timed, now: NOW, fetchJson: net.fetchJson, probeReachable });

const standings13 = [
  ['driverstandings', () => driverStandings],
  ['constructorstandings', () => teamStandings],
] satisfies Array<[string, Route]>;

describe('refreshResults —— 立即更新', () => {
  it('Jolpica 已有正式資料：套用正式結果與積分榜，頁尾時間更新，完全不碰 OpenF1', async () => {
    const net = fakeNet([['/results', () => jolpicaRace], ['/qualifying', () => jolpicaQuali], ...standings13]);
    const out = await run(net);
    const italy = out.snapshot.weekends.find((w) => w.round === 13)!;
    expect(italy.results).toHaveLength(italyFull.results!.length);
    expect(italy.qualifying).toHaveLength(italyFull.qualifying!.length);
    expect(out.snapshot.completedRound).toBe(13);
    expect(out.snapshot.driverStandings[0]!.points).toBe(full.driverStandings[0]!.points);
    expect(out.snapshot.fetchedAt).toBe(NOW.toISOString());
    expect(out.changed).toBe(true);
    expect(out.notes).toEqual([]);
    expect(net.calls.some((u) => u.includes('openf1'))).toBe(false);
  });

  it('Jolpica 還沒有、OpenF1 有：產生暫定結果，不寫入正式欄位，也不抓積分榜', async () => {
    const net = fakeNet([
      ['/results', () => empty],
      ['/qualifying', () => empty],
      ['sessions?year', () => [raceSession, qualiSession]],
      ['drivers?meeting_key', () => meetingDrivers],
      ['session_key=9001', () => openF1RaceRows],
      ['session_key=9002', () => [{ position: 1, driver_number: 16, number_of_laps: 20, dnf: false, dns: false, dsq: false, duration: [80, 79, 78], gap_to_leader: [0, 0, 0] }]],
    ]);
    const out = await run(net);
    const italy = out.snapshot.weekends.find((w) => w.round === 13)!;
    expect(italy.results).toBeNull();
    expect(italy.provisional?.race?.[0]).toMatchObject({ driverId: 'leclerc', durationMs: 5_400_500 });
    expect(italy.provisional?.qualifying?.[0]!.segmentsMs).toEqual([80000, 79000, 78000]);
    expect(out.changed).toBe(true);
    expect(out.snapshot.completedRound).toBe(12);
    expect(net.calls.some((u) => u.includes('standings'))).toBe(false);
  });

  it('之後 Jolpica 有了正式資料：正式結果取代暫定結果', async () => {
    const provisionalNet = fakeNet([
      ['/results', () => empty],
      ['/qualifying', () => empty],
      ['sessions?year', () => [raceSession, qualiSession]],
      ['drivers?meeting_key', () => meetingDrivers],
      ['session_key=9001', () => openF1RaceRows],
      ['session_key=9002', () => openF1RaceRows],
    ]);
    const first = await run(provisionalNet);
    const officialNet = fakeNet([['/results', () => jolpicaRace], ['/qualifying', () => jolpicaQuali], ...standings13]);
    const second = await run(officialNet, first.snapshot, first.timed);
    const italy = second.snapshot.weekends.find((w) => w.round === 13)!;
    expect(italy.results).not.toBeNull();
    expect(italy.provisional?.race).toBeUndefined();
    expect(italy.provisional?.qualifying).toBeUndefined();
  });

  it('OpenF1 回 401（場次進行中）：保留原資料、不當成一般錯誤', async () => {
    const net = fakeNet([
      ['/results', () => empty],
      ['/qualifying', () => empty],
      ['sessions?year', () => { throw new HttpError(401, 'live'); }],
    ]);
    const before = stale();
    const out = await run(net, before);
    expect(out.notes).toContainEqual({ kind: 'live-session' });
    expect(out.notes.some((n) => n.kind === 'error')).toBe(false);
    expect(out.changed).toBe(false);
    expect(out.snapshot).toBe(before);
    expect(out.snapshot.fetchedAt).toBe('2026-09-10T00:00:00.000Z');
  });

  it('瀏覽器看不到 OpenF1 的 401（回應沒有 CORS 標頭，fetch 只會丟網路錯誤）：伺服器連得到就視為場次進行中', async () => {
    const net = fakeNet([
      ['/results', () => empty],
      ['/qualifying', () => empty],
      ['sessions?year', () => { throw new TypeError('Failed to fetch'); }],
    ]);
    const probed: string[] = [];
    const out = await run(net, stale(), timedFull(), async (url) => { probed.push(url); return true; });
    expect(out.notes).toContainEqual({ kind: 'live-session' });
    expect(out.notes.some((n) => n.kind === 'error')).toBe(false);
    expect(probed).toHaveLength(1);
    expect(probed[0]).toContain('openf1');
  });

  it('OpenF1 連不到（探測也失敗）：才是真的網路錯誤', async () => {
    const net = fakeNet([
      ['/results', () => empty],
      ['/qualifying', () => empty],
      ['sessions?year', () => { throw new TypeError('Failed to fetch'); }],
    ]);
    const out = await run(net, stale(), timedFull(), async () => false);
    expect(out.notes.some((n) => n.kind === 'error')).toBe(true);
    expect(out.notes).not.toContainEqual({ kind: 'live-session' });
  });

  it('兩邊都還沒有資料：維持原樣並說明是「尚無資料」，不是錯誤', async () => {
    const net = fakeNet([
      ['/results', () => empty],
      ['/qualifying', () => empty],
      ['sessions?year', () => []],
    ]);
    const out = await run(net);
    expect(out.changed).toBe(false);
    expect(out.notes).toContainEqual({ kind: 'no-data-yet', sessions: ['race', 'qualifying'] });
  });

  it('網路錯誤：保留原資料並回報錯誤', async () => {
    const net = fakeNet([
      ['/results', () => { throw new TypeError('Failed to fetch'); }],
      ['/qualifying', () => { throw new TypeError('Failed to fetch'); }],
      ['sessions?year', () => { throw new TypeError('Failed to fetch'); }],
    ]);
    const before = stale();
    const out = await run(net, before);
    expect(out.changed).toBe(false);
    expect(out.snapshot).toBe(before);
    expect(out.notes.some((n) => n.kind === 'error')).toBe(true);
  });

  it('Jolpica 的積分榜站次落後於剛取得的正賽結果：賽果收下、積分榜丟棄並提示，不自行推算', async () => {
    const lagging = JSON.parse(JSON.stringify(driverStandings));
    lagging.MRData.StandingsTable.round = '12';
    lagging.MRData.StandingsTable.StandingsLists[0].round = '12';
    const laggingTeams = JSON.parse(JSON.stringify(teamStandings));
    laggingTeams.MRData.StandingsTable.round = '12';
    laggingTeams.MRData.StandingsTable.StandingsLists[0].round = '12';
    const net = fakeNet([
      ['/results', () => jolpicaRace],
      ['/qualifying', () => jolpicaQuali],
      ['driverstandings', () => lagging],
      ['constructorstandings', () => laggingTeams],
    ]);
    const before = stale();
    const out = await run(net, before);
    expect(out.snapshot.weekends.find((w) => w.round === 13)!.results).not.toBeNull();
    expect(out.snapshot.driverStandings).toBe(before.driverStandings);
    expect(out.snapshot.completedRound).toBe(12);
    expect(out.notes).toContainEqual({ kind: 'standings-stale', expected: 13, got: 12 });
    expect(out.changed).toBe(true);
  });

  it('沒有待補場次：不發任何請求', async () => {
    const net = fakeNet([]);
    const out = await run(net, full, timedFull());
    expect(net.calls).toEqual([]);
    expect(out.nothingPending).toBe(true);
    expect(out.changed).toBe(false);
  });

  it('練習賽名次表：向 OpenF1 補抓，疊進 sidecar 並更新場次第一名', async () => {
    const net = fakeNet([
      ['/results', () => jolpicaRace],
      ['/qualifying', () => jolpicaQuali],
      ...standings13,
      ['sessions?year', () => [{ session_key: 9100, meeting_key: 77, session_name: 'Practice 3', date_start: italyFull.sessions.find((s) => s.kind === 'fp3')!.startsAt }]],
      ['drivers?meeting_key', () => meetingDrivers],
      ['session_key=9100', () => [{ position: 1, driver_number: 16, number_of_laps: 20, dnf: false, dns: false, dsq: false, duration: 82.5, gap_to_leader: 0 }]],
    ]);
    const { [timedKey(13, 'fp3')]: _drop, ...timed } = timedFull();
    const out = await run(net, stale(), timed);
    expect(out.timed[timedKey(13, 'fp3')]![0]).toMatchObject({ driverId: 'leclerc', bestLapMs: 82500 });
    const fp3 = out.snapshot.weekends.find((w) => w.round === 13)!.sessions.find((s) => s.kind === 'fp3')!;
    expect(fp3.leader).toMatchObject({ driverId: 'leclerc' });
  });

  it(`請求次數不超過 ${MAX_REQUESTS_PER_REFRESH}（最壞情況：3 場次都得走 OpenF1）`, async () => {
    const net = fakeNet([
      ['/results', () => empty],
      ['/qualifying', () => empty],
      ['/sprint', () => empty],
      ['sessions?year', () => [raceSession, qualiSession]],
      ['drivers?meeting_key', () => meetingDrivers],
      ['session_key', () => openF1RaceRows],
    ]);
    await run(net, stale(), {});
    expect(net.calls.length).toBeLessThanOrEqual(MAX_REQUESTS_PER_REFRESH);
  });
});
