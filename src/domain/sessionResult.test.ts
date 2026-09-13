import { describe, expect, it } from 'vitest';
import { fixtureInput } from '../data/__fixtures__/buildFixtureSnapshot.ts';
import sessions from '../data/__fixtures__/openf1-sessions.json' with { type: 'json' };
import fp1Rows from '../data/__fixtures__/openf1-session-result-fp1.json' with { type: 'json' };
import sqRows from '../data/__fixtures__/openf1-session-result-sq.json' with { type: 'json' };
import meetingDrivers from '../data/__fixtures__/openf1-drivers-meeting.json' with { type: 'json' };
import { normaliseSeason } from '../data/jolpica.ts';
import type { RawOpenF1SessionResult } from '../data/openf1.ts';
import { formatGapMs, formatLapMs } from './laptime.ts';
import { buildViewModel } from './viewModel.ts';

const snapshot = normaliseSeason({
  ...fixtureInput(),
  openF1Sessions: {
    sessions,
    results: { 11354: fp1Rows as RawOpenF1SessionResult[], 11236: sqRows as RawOpenF1SessionResult[] },
    drivers: meetingDrivers,
  },
});
const at = (iso: string) => buildViewModel([snapshot], new Date(iso));
const italy = (iso: string) => at(iso).weekends.find((w) => w.round === 13)!;

describe('場次結果（View Model）', () => {
  it('練習賽名次表已解析車手與車隊，時間格式化為 m:ss.mmm、差距為 +s.mmm', () => {
    const fp1 = italy('2026-09-10T12:00:00Z').sessions.find((s) => s.kind === 'fp1')!;
    expect(fp1.result).toHaveLength(22);
    expect(fp1.result?.[0]).toMatchObject({ position: 1, bestLap: '1:23.008', gap: '' });
    expect(fp1.result?.[0]?.driver?.id).toBe('leclerc');
    expect(fp1.result?.[0]?.team?.id).toBe('ferrari');
    expect(fp1.result?.[21]).toMatchObject({ bestLap: '1:29.922', gap: '+6.914' });
  });

  it('對不到車手的車號：driver 與 team 為 null、車號保留', () => {
    const fp1 = italy('2026-09-10T12:00:00Z').sessions.find((s) => s.kind === 'fp1')!;
    const iwasa = fp1.result?.find((r) => r.driverNumber === 36);
    expect(iwasa).toMatchObject({ driver: null, team: null, driverNumber: 36 });
  });

  it('沒抓到的練習賽 result 為 null', () => {
    expect(italy('2026-09-10T12:00:00Z').sessions.find((s) => s.kind === 'fp2')!.result).toBeNull();
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
