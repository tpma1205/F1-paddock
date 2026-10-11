import { describe, expect, it } from 'vitest';
import { toProvisionalResults } from './openf1.ts';
import type { RawOpenF1SessionResult } from './openf1.ts';

/**
 * 以下 session_result 列是依**練習賽／衝刺排位的實測格式**與 OpenF1 文件推得的
 * 排位賽、正賽形狀（寫作時 OpenF1 正在直播、回 401，無法實測；見 docs/adr/0005）。
 * 欄位名與練習賽相同；差別只在 duration／gap_to_leader 的內容。
 */
const numberToCode = new Map([
  [16, 'LEC'],
  [1, 'NOR'],
  [44, 'HAM'],
  [36, 'IWA'],
]);
const codeToDriverId = new Map([
  ['LEC', 'leclerc'],
  ['NOR', 'norris'],
  ['HAM', 'hamilton'],
]);
const driverToTeam = new Map([
  ['leclerc', 'ferrari'],
  ['norris', 'mclaren'],
  ['hamilton', 'ferrari'],
]);

const row = (over: Partial<RawOpenF1SessionResult>): RawOpenF1SessionResult => ({
  position: 1,
  driver_number: 16,
  number_of_laps: 53,
  dnf: false,
  dns: false,
  dsq: false,
  duration: null,
  gap_to_leader: null,
  ...over,
});

const convert = (rows: RawOpenF1SessionResult[], kind: 'race' | 'qualifying' | 'sprint') =>
  toProvisionalResults(kind, rows, numberToCode, codeToDriverId, driverToTeam);

describe('toProvisionalResults —— OpenF1 名次 → 暫定結果', () => {
  it('正賽：總時間與差距轉毫秒，車手與車隊對回 Jolpica', () => {
    const [winner, second] = convert(
      [
        row({ position: 1, driver_number: 16, duration: 5400.123, gap_to_leader: 0 }),
        row({ position: 2, driver_number: 1, duration: 5405.6, gap_to_leader: 5.477 }),
      ],
      'race',
    );
    expect(winner).toMatchObject({
      position: 1,
      driverId: 'leclerc',
      teamId: 'ferrari',
      outcome: 'classified',
      durationMs: 5_400_123,
      gapMs: 0,
      gapText: null,
      laps: 53,
      segmentsMs: null,
    });
    expect(second).toMatchObject({ position: 2, driverId: 'norris', teamId: 'mclaren', gapMs: 5477 });
  });

  it('正賽：落圈的非數字差距保留原文，不當成毫秒', () => {
    const [first, lapped] = convert(
      [row({ position: 1, gap_to_leader: 0 }), row({ position: 2, driver_number: 1, gap_to_leader: '+1 LAP' })],
      'race',
    );
    expect(first!.gapText).toBeNull();
    expect(lapped).toMatchObject({ gapMs: null, gapText: '+1 LAP' });
  });

  it('DNF、DNS、DSQ 各自標記，沒有時間，排在有名次者之後且名次連續', () => {
    const rows = convert(
      [
        row({ position: null, driver_number: 44, dnf: true, number_of_laps: 12 }),
        row({ position: 1, driver_number: 16, duration: 5400, gap_to_leader: 0 }),
        row({ position: null, driver_number: 1, dns: true, number_of_laps: 0 }),
        row({ position: null, driver_number: 36, dsq: true }),
      ],
      'race',
    );
    expect(rows.map((r) => r.driverNumber)).toEqual([16, 44, 1, 36]);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3, 4]);
    expect(rows.map((r) => r.outcome)).toEqual(['classified', 'dnf', 'dns', 'dsq']);
    expect(rows[1]).toMatchObject({ durationMs: null, gapMs: null, laps: 12 });
  });

  it('排位賽：Q1–Q3 三節時間，被淘汰的節為 null', () => {
    const [pole, out] = convert(
      [
        row({ position: 1, duration: [80.1, 79.5, 78.9], gap_to_leader: [0, 0, 0] }),
        row({ position: 2, driver_number: 1, duration: [81.0, null, null] }),
      ],
      'qualifying',
    );
    expect(pole!.segmentsMs).toEqual([80100, 79500, 78900]);
    expect(out!.segmentsMs).toEqual([81000, null, null]);
    expect(pole!.durationMs).toBeNull();
  });

  it('不在積分榜的車手（青年車手）保留車號，driverId 與 teamId 皆為 null —— 不猜', () => {
    const [iwasa] = convert([row({ driver_number: 36 })], 'race');
    expect(iwasa).toMatchObject({ driverNumber: 36, driverId: null, teamId: null });
  });

  it('不編造 Jolpica 才有的欄位：結果裡沒有積分、起跑格、最快圈', () => {
    const [only] = convert([row({})], 'race');
    expect(Object.keys(only!)).not.toEqual(expect.arrayContaining(['points']));
    expect(only).not.toHaveProperty('points');
    expect(only).not.toHaveProperty('grid');
    expect(only).not.toHaveProperty('fastestLap');
  });
});
