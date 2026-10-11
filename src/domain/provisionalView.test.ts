import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshot } from '../data/__fixtures__/buildFixtureSnapshot.ts';
import { buildViewModel } from './viewModel.ts';
import { formatRaceTimeMs } from './laptime.ts';
import type { Snapshot } from './types.ts';

const full = buildFixtureSnapshot();
const italyFull = full.weekends.find((w) => w.round === 13)!;
const after = new Date(Date.parse(italyFull.sessions.find((s) => s.kind === 'race')!.startsAt) + 5 * 3_600_000);

const withProvisional = (): Snapshot => ({
  ...full,
  weekends: full.weekends.map((w) =>
    w.round === 13
      ? {
          ...w,
          results: null,
          qualifying: null,
          provisional: {
            race: [
              { position: 1, driverNumber: 16, driverId: 'leclerc', teamId: 'ferrari', laps: 53, outcome: 'classified' as const, durationMs: 5_400_500, gapMs: 0, gapText: null, segmentsMs: null },
              { position: 2, driverNumber: 1, driverId: 'norris', teamId: 'mclaren', laps: 53, outcome: 'classified' as const, durationMs: 5_405_977, gapMs: 5_477, gapText: null, segmentsMs: null },
              { position: 3, driverNumber: 44, driverId: 'hamilton', teamId: 'ferrari', laps: 52, outcome: 'classified' as const, durationMs: null, gapMs: null, gapText: '+1 LAP', segmentsMs: null },
              { position: 4, driverNumber: 36, driverId: null, teamId: null, laps: 3, outcome: 'dnf' as const, durationMs: null, gapMs: null, gapText: null, segmentsMs: null },
            ],
            qualifying: [
              { position: 1, driverNumber: 16, driverId: 'leclerc', teamId: 'ferrari', laps: 20, outcome: 'classified' as const, durationMs: null, gapMs: null, gapText: null, segmentsMs: [80_100, 79_500, 78_900] },
              { position: 2, driverNumber: 1, driverId: 'norris', teamId: 'mclaren', laps: 12, outcome: 'classified' as const, durationMs: null, gapMs: null, gapText: null, segmentsMs: [81_000, null, null] },
            ],
          },
        }
      : w,
  ),
});

describe('formatRaceTimeMs', () => {
  it('超過一小時為 h:mm:ss.mmm，不足一小時為 m:ss.mmm', () => {
    expect(formatRaceTimeMs(5_400_500)).toBe('1:30:00.500');
    expect(formatRaceTimeMs(754_321)).toBe('12:34.321');
  });
});

describe('暫定結果進 View Model', () => {
  const weekend = buildViewModel([withProvisional()], after).weekends.find((w) => w.round === 13)!;

  it('正式欄位維持 null —— 暫定結果不假冒正式結果', () => {
    expect(weekend.results).toBeNull();
    expect(weekend.podium).toEqual([]);
  });

  it('正賽暫定：冠軍是總時間、其餘是差距、落圈保留原文、DNF 沒有時間', () => {
    const rows = weekend.provisional.race!;
    expect(rows.map((r) => r.time)).toEqual(['1:30:00.500', '+5.477', '+1 LAP', null]);
    expect(rows[0]!.driver?.id).toBe('leclerc');
    expect(rows[0]!.team?.id).toBe('ferrari');
    expect(rows[3]).toMatchObject({ driver: null, team: null, outcome: 'dnf' });
  });

  it('排位賽暫定：三節時間格式化，最快圈取跑到的最後一節', () => {
    const [pole, out] = weekend.provisional.qualifying!;
    expect(pole!.segments).toEqual(['1:20.100', '1:19.500', '1:18.900']);
    expect(pole!.best).toBe('1:18.900');
    expect(out!.best).toBe('1:21.000');
  });

  it('場次面板的第一名在沒有正式結果時由暫定結果補上', () => {
    const race = weekend.sessions.find((s) => s.kind === 'race')!;
    expect(race.leader?.driver?.id).toBe('leclerc');
  });

  it('沒有暫定結果的週末，provisional 是空物件', () => {
    const plain = buildViewModel([full], after).weekends.find((w) => w.round === 13)!;
    expect(plain.provisional).toEqual({});
  });
});
