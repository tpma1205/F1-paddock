import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshotWithTimed, fixtureTimedResults } from '../data/__fixtures__/buildFixtureSnapshot.ts';
import { formatGapMs, formatLapMs } from './laptime.ts';
import { buildViewModel, toTimedResultViews } from './viewModel.ts';

const snapshot = buildFixtureSnapshotWithTimed();
const timed = fixtureTimedResults();
const at = (iso: string) => buildViewModel([snapshot], new Date(iso));
const italy = (iso: string) => at(iso).weekends.find((w) => w.round === 13)!;

describe('場次結果（View Model）', () => {
  it('sidecar 名次表經 toTimedResultViews 解析車手與車隊，時間格式化為 m:ss.mmm、差距為 +s.mmm', () => {
    const rows = toTimedResultViews(timed['13:fp1']!, at('2026-09-10T12:00:00Z'));
    expect(rows).toHaveLength(22);
    expect(rows[0]).toMatchObject({ position: 1, bestLap: '1:23.008', gap: '' });
    expect(rows[0]?.driver?.id).toBe('leclerc');
    expect(rows[0]?.team?.id).toBe('ferrari');
    expect(rows[21]).toMatchObject({ bestLap: '1:29.922', gap: '+6.914' });
  });

  it('對不到車手的車號：driver 與 team 為 null、車號保留', () => {
    const rows = toTimedResultViews(timed['13:fp1']!, at('2026-09-10T12:00:00Z'));
    expect(rows.find((r) => r.driverNumber === 36)).toMatchObject({ driver: null, team: null, driverNumber: 36 });
  });

  describe('第一名（場次面板用）', () => {
    it('練習賽：第一名縮寫 + Best Lap', () => {
      const fp1 = italy('2026-09-10T12:00:00Z').sessions.find((s) => s.kind === 'fp1')!;
      expect(fp1.leader).toMatchObject({ code: 'LEC', time: '1:23.008' });
    });

    it('排位賽：來自 Race Weekend 的排位結果，時間取跑到的最後一節', () => {
      const q = italy('2026-09-10T12:00:00Z').sessions.find((s) => s.kind === 'qualifying')!;
      expect(q.leader?.code).toBeTruthy();
      expect(q.leader?.time).toMatch(/^\d:\d\d\.\d\d\d$/);
    });

    it('正賽：冠軍縮寫，沒有時間', () => {
      const race = italy('2026-09-10T12:00:00Z').sessions.find((s) => s.kind === 'race')!;
      expect(race.leader?.code).toBeTruthy();
      expect(race.leader?.time).toBeNull();
    });

    it('衝刺排位：來自 OpenF1 的三節結果', () => {
      const sq = at('2026-09-10T12:00:00Z').weekends.find((w) => w.round === 2)!.sessions.find((s) => s.kind === 'sprintQualifying')!;
      expect(sq.leader).toMatchObject({ code: 'RUS', time: '1:31.520' });
    });

    it('場次尚未結束時沒有第一名，就算資料裡有', () => {
      // 義大利 FP1 是 09-04 10:30Z；退回到開始前
      const fp1 = italy('2026-09-04T10:00:00Z').sessions.find((s) => s.kind === 'fp1')!;
      expect(fp1.status).toBe('upcoming');
      expect(fp1.leader).toBeNull();
    });

    it('已結束但沒有資料的場次第一名為 null', () => {
      const fp2 = italy('2026-09-10T12:00:00Z').sessions.find((s) => s.kind === 'fp2')!;
      expect(fp2.status).toBe('finished');
      expect(fp2.leader).toBeNull();
    });
  });
});

describe('單站頁預設籤：最近一個已結束的場次', () => {
  // 義大利站：FP1 09-04 10:30Z、FP2 14:00Z、FP3 09-05 10:30Z、排位 14:00Z、正賽 09-06 13:00Z
  const kindAt = (iso: string) => italy(iso).latestFinishedSession;

  it('週五 FP1 結束後停在 FP1', () => expect(kindAt('2026-09-04T12:00:00Z')).toBe('fp1'));
  it('週六排位結束後停在排位賽', () => expect(kindAt('2026-09-05T16:00:00Z')).toBe('qualifying'));
  it('週日正賽結束後停在正賽', () => expect(kindAt('2026-09-06T16:00:00Z')).toBe('race'));
  it('場次進行中時停在前一個已結束的', () => expect(kindAt('2026-09-05T11:00:00Z')).toBe('fp2'));
  it('全部未開始為 null', () => expect(kindAt('2026-09-01T00:00:00Z')).toBeNull());
  it('Off-season（隔年）仍是正賽', () => expect(kindAt('2027-01-15T00:00:00Z')).toBe('race'));

  it('排位與衝刺賽結果已解析車手與車隊', () => {
    const w = italy('2026-09-10T12:00:00Z');
    expect(w.qualifying?.[0]?.driver.code).toBeTruthy();
    expect(w.qualifying?.[0]?.team.id).toBeTruthy();
    const china = at('2026-09-10T12:00:00Z').weekends.find((x) => x.round === 2)!;
    expect(china.sprintResults?.[0]?.driver.id).toBeTruthy();
  });
});

describe('laptime 格式化', () => {
  it('formatLapMs', () => {
    expect(formatLapMs(83008)).toBe('1:23.008');
    expect(formatLapMs(59999)).toBe('0:59.999');
    expect(formatLapMs(120000)).toBe('2:00.000');
  });

  it('formatGapMs：第一名為空、其餘 +s.mmm', () => {
    expect(formatGapMs(0)).toBe('');
    expect(formatGapMs(442)).toBe('+0.442');
    expect(formatGapMs(6914)).toBe('+6.914');
    expect(formatGapMs(61500)).toBe('+61.500');
  });
});
