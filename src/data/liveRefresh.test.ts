import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshot, fixtureTimedResults } from './__fixtures__/buildFixtureSnapshot.ts';
import { RESULT_DUE_MINUTES, findPending } from './liveRefresh.ts';
import { timedKey, type Snapshot } from '../domain/types.ts';

const base = buildFixtureSnapshot();
const italy = base.weekends.find((w) => w.round === 13)!;
const sessionAt = (kind: string): number => Date.parse(italy.sessions.find((s) => s.kind === kind)!.startsAt);
const minutes = (n: number): number => n * 60_000;

/** 義大利站三個練習賽的名次表都齊（fixture 只錄了 FP1，其餘借用同一份）。 */
const allTimed = () => {
  const timed = fixtureTimedResults();
  const fp1 = timed[timedKey(13, 'fp1')]!;
  return { ...timed, [timedKey(13, 'fp2')]: fp1, [timedKey(13, 'fp3')]: fp1 };
};

/** 義大利站（第 13 站）剛結束、快照還沒有正賽與排位賽結果的狀態。 */
const withoutRaceResults = (): Snapshot => ({
  ...base,
  completedRound: 12,
  weekends: base.weekends.map((w) =>
    w.round === 13 ? { ...w, results: null, qualifying: null, sprintResults: null } : w,
  ),
});

describe('findPending —— 哪些場次是「已結束、但快照裡還沒有結果」', () => {
  it('正賽開始後 3.5 小時內不算到期；超過才算（紅旗可能拖長）', () => {
    const snapshot = withoutRaceResults();
    const race = sessionAt('race');
    const early = findPending(snapshot, {}, new Date(race + minutes(RESULT_DUE_MINUTES.race) - 1));
    expect(early.sessions).not.toContain('race');
    const late = findPending(snapshot, {}, new Date(race + minutes(RESULT_DUE_MINUTES.race)));
    expect(late.sessions).toContain('race');
  });

  it('固定時長：練習賽與衝刺排位 90 分、衝刺賽 90 分、排位賽 120 分、正賽 210 分', () => {
    expect(RESULT_DUE_MINUTES).toEqual({
      fp1: 90,
      fp2: 90,
      fp3: 90,
      sprintQualifying: 90,
      sprint: 90,
      qualifying: 120,
      race: 210,
    });
  });

  it('只看最近一個有待補場次的賽事週末', () => {
    const snapshot = withoutRaceResults();
    const afterRace = new Date(sessionAt('race') + minutes(300));
    const pending = findPending(snapshot, {}, afterRace);
    expect(pending.round).toBe(13);
  });

  it('已有正式結果的場次不再列入', () => {
    const snapshot: Snapshot = {
      ...withoutRaceResults(),
      weekends: withoutRaceResults().weekends.map((w) =>
        w.round === 13 ? { ...w, results: base.weekends.find((x) => x.round === 13)!.results } : w,
      ),
    };
    const pending = findPending(snapshot, allTimed(), new Date(sessionAt('race') + minutes(300)));
    expect(pending.sessions).not.toContain('race');
    expect(pending.sessions).toContain('qualifying');
  });

  it('只有暫定結果的場次仍待補 —— 要等正式結果取代', () => {
    const snapshot = withoutRaceResults();
    snapshot.weekends = snapshot.weekends.map((w) =>
      w.round === 13 ? { ...w, provisional: { race: [] } } : w,
    );
    const pending = findPending(snapshot, {}, new Date(sessionAt('race') + minutes(300)));
    expect(pending.sessions).toContain('race');
  });

  it('練習賽：sidecar 沒有該場次才算待補，有名次表就不算', () => {
    const snapshot = withoutRaceResults();
    const now = new Date(sessionAt('race') + minutes(300));
    const timed = allTimed();
    expect(findPending(snapshot, timed, now).sessions).not.toContain('fp1');
    const { [timedKey(13, 'fp1')]: _removed, ...withoutFp1 } = timed;
    expect(findPending(snapshot, withoutFp1, now).sessions).toContain('fp1');
  });

  it('一次最多 3 個場次，優先順序為正賽、排位賽、衝刺賽、其餘', () => {
    const snapshot = withoutRaceResults();
    const pending = findPending(snapshot, {}, new Date(sessionAt('race') + minutes(300)));
    expect(pending.sessions).toHaveLength(3);
    expect(pending.sessions.slice(0, 2)).toEqual(['race', 'qualifying']);
  });

  it('什麼都不缺時沒有待補場次，也不需要抓積分榜', () => {
    const pending = findPending(base, allTimed(), new Date(sessionAt('race') + minutes(300)));
    expect(pending.sessions).toEqual([]);
    expect(pending.round).toBeNull();
    expect(pending.standingsBehind).toBe(false);
  });

  it('正賽結果已有、但積分榜的站次落後 → 積分榜待補', () => {
    const snapshot: Snapshot = { ...base, completedRound: 12 };
    const pending = findPending(snapshot, allTimed(), new Date(sessionAt('race') + minutes(300)));
    expect(pending.sessions).toEqual([]);
    expect(pending.standingsBehind).toBe(true);
  });

  it('場次還沒到期時（正賽未結束）不列入', () => {
    const pending = findPending(withoutRaceResults(), {}, new Date(sessionAt('race') + minutes(10)));
    expect(pending.sessions).not.toContain('race');
  });
});
