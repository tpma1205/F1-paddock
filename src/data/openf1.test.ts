import { describe, expect, it } from 'vitest';
import sessions from './__fixtures__/openf1-sessions.json' with { type: 'json' };
import fp1Rows from './__fixtures__/openf1-session-result-fp1.json' with { type: 'json' };
import sqRows from './__fixtures__/openf1-session-result-sq.json' with { type: 'json' };
import meetingDrivers from './__fixtures__/openf1-drivers-meeting.json' with { type: 'json' };
import { buildFixtureSnapshot, fixtureInput } from './__fixtures__/buildFixtureSnapshot.ts';
import { carryForwardTimedResults, matchOpenF1Session, toTimedResults, TIMED_KINDS } from './openf1.ts';
import { normaliseSeason } from './jolpica.ts';
import type { RawOpenF1SessionResult } from './openf1.ts';

const snapshot = buildFixtureSnapshot();
const italy = snapshot.weekends.find((w) => w.round === 13)!;
const china = snapshot.weekends.find((w) => w.round === 2)!;

describe('matchOpenF1Session —— 以開始時間 + 場次種類對到 OpenF1 的 session_key', () => {
  it('義大利站 FP1 對到 11354', () => {
    const fp1 = italy.sessions.find((s) => s.kind === 'fp1')!;
    expect(matchOpenF1Session(fp1, sessions)).toBe(11354);
  });

  it('中國站衝刺排位對到 11236', () => {
    const sq = china.sessions.find((s) => s.kind === 'sprintQualifying')!;
    expect(matchOpenF1Session(sq, sessions)).toBe(11236);
  });

  it('季前測試（Day 1–3）不會被誤對', () => {
    // 巴林季前測試與任何賽程場次時間都不同，理應對不到
    const fake = { kind: 'fp1' as const, startsAt: '2026-02-11T07:00:00.000Z', result: null };
    expect(matchOpenF1Session(fake, sessions)).toBeNull();
  });

  it('時間對得上但種類不同時不對', () => {
    const q = italy.sessions.find((s) => s.kind === 'qualifying')!;
    expect(matchOpenF1Session({ ...q, kind: 'fp3' }, sessions)).toBeNull();
  });
});

describe('toTimedResults —— OpenF1 名次表 → TimedResult', () => {
  const numberToCode = new Map(meetingDrivers.map((d) => [d.driver_number, d.name_acronym] as const));
  const codeToDriverId = new Map(
    snapshot.driverStandings.flatMap((s) => (s.driver.code ? [[s.driver.code, s.driver.id] as const] : [])),
  );

  it('練習賽：名次、最快圈與差距以毫秒整數存', () => {
    const rows = toTimedResults(fp1Rows as RawOpenF1SessionResult[], numberToCode, codeToDriverId);
    expect(rows).toHaveLength(22);
    expect(rows[0]).toMatchObject({ position: 1, driverNumber: 16, driverId: 'leclerc', bestLapMs: 83008, gapMs: 0, laps: 29 });
    expect(rows[21]).toMatchObject({ position: 22, driverNumber: 25, bestLapMs: 89922, gapMs: 6914 });
  });

  it('車號用 OpenF1 的縮寫表對回 Jolpica 車手 —— 冠軍掛 1 號，靠車號本身對不到人', () => {
    const rows = toTimedResults(fp1Rows as RawOpenF1SessionResult[], numberToCode, codeToDriverId);
    expect(rows.find((r) => r.driverNumber === 1)?.driverId).toBe('norris');
    expect(rows.find((r) => r.driverNumber === 12)?.driverId).toBe('antonelli');
  });

  it('FP1 的青年車手（不在積分榜）保留車號、driverId 為 null —— 義大利站 Iwasa 代跑 Verstappen 的車', () => {
    const rows = toTimedResults(fp1Rows as RawOpenF1SessionResult[], numberToCode, codeToDriverId);
    expect(rows.find((r) => r.driverNumber === 36)).toMatchObject({ driverId: null, driverNumber: 36 });
    expect(rows.some((r) => r.driverNumber === 3)).toBe(false);
  });

  it('對不到縮寫或不在積分榜的車號：保留車號、driverId 為 null', () => {
    const rows = toTimedResults(
      [{ position: 1, driver_number: 99, number_of_laps: 3, dnf: false, dns: false, dsq: false, duration: 90, gap_to_leader: 0 }],
      numberToCode,
      codeToDriverId,
    );
    expect(rows[0]).toMatchObject({ driverNumber: 99, driverId: null });
  });

  it('沒有時間（duration 為 null）或 DNS 的車手：bestLapMs 與 gapMs 為 null', () => {
    const rows = toTimedResults(
      [
        { position: 1, driver_number: 16, number_of_laps: 10, dnf: false, dns: false, dsq: false, duration: 83.008, gap_to_leader: 0 },
        { position: 2, driver_number: 1, number_of_laps: 0, dnf: false, dns: true, dsq: false, duration: null, gap_to_leader: null },
      ],
      numberToCode,
      codeToDriverId,
    );
    expect(rows[1]).toMatchObject({ bestLapMs: null, gapMs: null, laps: 0 });
  });

  it('衝刺排位：duration 是三節陣列，取最快一節；差距取最後參與那一節', () => {
    const rows = toTimedResults(sqRows as RawOpenF1SessionResult[], numberToCode, codeToDriverId);
    expect(rows[0]).toMatchObject({ position: 1, bestLapMs: 91520, gapMs: 0 });
    // 最後一位只跑了 SQ1
    expect(rows.at(-1)).toMatchObject({ position: 21, bestLapMs: 97378, gapMs: 4348 });
  });

  it('依名次排序，不信任回應順序', () => {
    const shuffled = [...(fp1Rows as RawOpenF1SessionResult[])].reverse();
    const rows = toTimedResults(shuffled, numberToCode, codeToDriverId);
    expect(rows.map((r) => r.position)).toEqual(rows.map((_, i) => i + 1));
  });
});

describe('normaliseSeason 帶 OpenF1 場次結果', () => {
  const withResults = normaliseSeason({
    ...fixtureInput(),
    openF1Sessions: { sessions, results: { 11354: fp1Rows as RawOpenF1SessionResult[], 11236: sqRows as RawOpenF1SessionResult[] }, drivers: meetingDrivers },
  });

  it('義大利站 FP1 有 22 筆結果，其餘練習賽（未抓）為 null', () => {
    const w = withResults.weekends.find((x) => x.round === 13)!;
    expect(w.sessions.find((s) => s.kind === 'fp1')?.result).toHaveLength(22);
    expect(w.sessions.find((s) => s.kind === 'fp2')?.result).toBeNull();
  });

  it('正賽／排位／衝刺賽的 Session.result 一律為 null —— 它們的 Result 在 Race Weekend 層', () => {
    for (const w of withResults.weekends) {
      for (const s of w.sessions) {
        if (!TIMED_KINDS.has(s.kind)) expect(s.result, `${w.round} ${s.kind}`).toBeNull();
      }
    }
  });

  it('沒給 OpenF1 場次資料時，所有 Session.result 為 null', () => {
    for (const w of snapshot.weekends) for (const s of w.sessions) expect(s.result).toBeNull();
  });
});

describe('carryForwardTimedResults —— OpenF1 失效時沿用上一份快照', () => {
  it('新快照缺的場次結果從舊快照補上；新快照已有的不覆蓋', () => {
    const previous = normaliseSeason({
      ...fixtureInput(),
      openF1Sessions: { sessions, results: { 11354: fp1Rows as RawOpenF1SessionResult[] }, drivers: meetingDrivers },
    });
    const next = normaliseSeason({
      ...fixtureInput(),
      openF1Sessions: { sessions, results: { 11236: sqRows as RawOpenF1SessionResult[] }, drivers: meetingDrivers },
    });
    const merged = carryForwardTimedResults(next, previous);
    const italyFp1 = merged.weekends.find((w) => w.round === 13)!.sessions.find((s) => s.kind === 'fp1')!;
    const chinaSq = merged.weekends.find((w) => w.round === 2)!.sessions.find((s) => s.kind === 'sprintQualifying')!;
    expect(italyFp1.result).toHaveLength(22);
    expect(chinaSq.result).toHaveLength(21);
    expect(merged.weekends.find((w) => w.round === 13)!.sessions.find((s) => s.kind === 'fp2')!.result).toBeNull();
  });

  it('不同季的舊快照不會被拿來補', () => {
    const previous = { ...snapshot, season: '2025' };
    expect(carryForwardTimedResults(snapshot, previous)).toEqual(snapshot);
  });
});
