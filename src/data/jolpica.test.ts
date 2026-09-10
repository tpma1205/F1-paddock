import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshot } from './__fixtures__/buildFixtureSnapshot.ts';

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

  it('一般週末產出 FP1／FP2／FP3／排位／正賽五節', () => {
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
