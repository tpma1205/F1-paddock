import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshot } from './__fixtures__/buildFixtureSnapshot.ts';
import {
  normaliseSeason,
  type RawDriverStandingsResponse,
  type RawRacesResponse,
  type RawTeamStandingsResponse,
} from './jolpica.ts';

describe('normaliseSeason', () => {
  const snapshot = buildFixtureSnapshot();

  it('讀出球季與已完成的站次，而非寫死年份', () => {
    expect(snapshot.season).toBe('2026');
    expect(snapshot.completedRound).toBe(13);
  });

  it('產出完整賽程並依站次排序', () => {
    expect(snapshot.weekends).toHaveLength(23);
    expect(snapshot.weekends.map((w) => w.round)).toEqual(
      Array.from({ length: 23 }, (_, i) => i + 1),
    );
  });

  it('保留賽道識別資訊供後續賽道頁使用', () => {
    const madrid = snapshot.weekends.find((w) => w.round === 14);
    expect(madrid?.name).toBe('Spanish Grand Prix');
    expect(madrid?.circuit).toMatchObject({
      id: 'madring',
      locality: 'Madrid',
      country: 'Spain',
    });
    expect(typeof madrid?.circuit.lat).toBe('number');
  });

  it('一般週末產出 FP1／FP2／FP3／排位／正賽五個場次', () => {
    const australia = snapshot.weekends.find((w) => w.round === 1);
    expect(australia?.sessions.map((s) => s.kind)).toEqual([
      'fp1',
      'fp2',
      'fp3',
      'qualifying',
      'race',
    ]);
  });

  it('Sprint Weekend 產出衝刺排位與衝刺賽，且不含 FP2／FP3', () => {
    const china = snapshot.weekends.find((w) => w.round === 2);
    expect(china?.sessions.map((s) => s.kind)).toEqual([
      'fp1',
      'sprintQualifying',
      'sprint',
      'qualifying',
      'race',
    ]);
  });

  it('每個週末的場次依時間排序', () => {
    for (const weekend of snapshot.weekends) {
      const times = weekend.sessions.map((s) => Date.parse(s.startsAt));
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it('把日期與時間合併為 ISO UTC 字串', () => {
    const madrid = snapshot.weekends.find((w) => w.round === 14);
    expect(madrid?.sessions[0]?.startsAt).toBe('2026-09-11T11:30:00.000Z');
    expect(madrid?.sessions.at(-1)?.startsAt).toBe('2026-09-13T13:00:00.000Z');
  });

  it('正規化車手積分榜', () => {
    const leader = snapshot.driverStandings[0];
    expect(leader).toMatchObject({
      position: 1,
      points: 267,
      wins: 7,
    });
    expect(leader?.driver.familyName).toBe('Antonelli');
    expect(leader?.driver.code).toBe('ANT');
    expect(leader?.teams[0]?.id).toBe('mercedes');
  });

  it('正規化車隊積分榜', () => {
    expect(snapshot.teamStandings[0]).toMatchObject({
      position: 1,
      points: 468,
    });
    expect(snapshot.teamStandings[0]?.team.id).toBe('mercedes');
    expect(snapshot.teamStandings).toHaveLength(11);
  });

  it('積分與名次是數字，不是字串', () => {
    for (const standing of snapshot.driverStandings) {
      expect(typeof standing.points).toBe('number');
      expect(typeof standing.position).toBe('number');
    }
  });
});

/**
 * 資料異常時的降級行為。
 *
 * 當前球季的所有場次都有時間，這些路徑只在 API 資料殘缺時才走到 ——
 * 正因為它們不會自然發生，才必須明確地測。
 */
describe('normaliseSeason 的降級行為', () => {
  const emptyDriverStandings: RawDriverStandingsResponse = {
    MRData: { StandingsTable: { season: '2026', round: '0', StandingsLists: [] } },
  };
  const emptyTeamStandings: RawTeamStandingsResponse = {
    MRData: { StandingsTable: { season: '2026', round: '0', StandingsLists: [] } },
  };

  const seasonWith = (race: RawRacesResponse['MRData']['RaceTable']['Races'][number]) =>
    normaliseSeason({
      races: { MRData: { RaceTable: { season: '2026', Races: [race] } } },
      driverStandings: emptyDriverStandings,
      teamStandings: emptyTeamStandings,
      fetchedAt: '2026-01-01T00:00:00.000Z',
    });

  const baseRace = {
    season: '2026',
    round: '1',
    raceName: 'Test Grand Prix',
    Circuit: {
      circuitId: 'test',
      circuitName: 'Test Circuit',
      Location: { lat: '0', long: '0', locality: 'Nowhere', country: 'Testland' },
    },
    date: '2026-03-08',
    time: '04:00:00Z',
  };

  it('捨棄缺少時間的練習賽，而非捏造一個看似真實的開賽時間', () => {
    const snapshot = seasonWith({
      ...baseRace,
      FirstPractice: { date: '2026-03-06' },
      SecondPractice: { date: '2026-03-06', time: '05:00:00Z' },
    });

    expect(snapshot.weekends[0]?.sessions.map((s) => s.kind)).toEqual(['fp2', 'race']);
  });

  it('正賽缺少時間時退回當日午夜，因為捨棄它會讓整個站次消失', () => {
    const { time: _omitted, ...raceWithoutTime } = baseRace;
    const snapshot = seasonWith(raceWithoutTime);
    const sessions = snapshot.weekends[0]?.sessions;

    expect(sessions).toHaveLength(1);
    expect(sessions?.[0]).toEqual({ kind: 'race', startsAt: '2026-03-08T00:00:00.000Z' });
  });

  it.each([
    ['../../../evil', '路徑片段'],
    ['2026/../../etc', '夾帶斜線'],
    ['20261', '五位數'],
    ['', '空字串'],
    ['abcd', '非數字'],
  ])('拒絕不合法的球季 %j（%s）', (season) => {
    const races: RawRacesResponse = { MRData: { RaceTable: { season, Races: [baseRace] } } };

    expect(() =>
      normaliseSeason({
        races,
        driverStandings: emptyDriverStandings,
        teamStandings: emptyTeamStandings,
        fetchedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow(/球季格式不合法/);
  });

  it('球季尚未開賽時 completedRound 為 null 而非 0', () => {
    expect(seasonWith(baseRace).completedRound).toBeNull();
  });

  it('積分榜為空時回傳空陣列而非拋錯', () => {
    const snapshot = seasonWith(baseRace);

    expect(snapshot.driverStandings).toEqual([]);
    expect(snapshot.teamStandings).toEqual([]);
  });

  it('車手缺少三字母縮寫時為 null，不由姓氏捏造', () => {
    const snapshot = normaliseSeason({
      races: { MRData: { RaceTable: { season: '2026', Races: [baseRace] } } },
      driverStandings: {
        MRData: {
          StandingsTable: {
            season: '2026',
            round: '1',
            StandingsLists: [
              {
                DriverStandings: [
                  {
                    position: '1',
                    points: '25',
                    wins: '1',
                    Driver: {
                      driverId: 'nocode',
                      givenName: 'No',
                      familyName: 'Codeman',
                      nationality: 'Testish',
                    },
                    Constructors: [
                      { constructorId: 'test', name: 'Test', nationality: 'Testish' },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      teamStandings: emptyTeamStandings,
      fetchedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(snapshot.driverStandings[0]?.driver.code).toBeNull();
    expect(snapshot.driverStandings[0]?.driver.permanentNumber).toBeNull();
  });
});
