import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshot } from '../data/__fixtures__/buildFixtureSnapshot.ts';
import { buildViewModel } from './viewModel.ts';

/**
 * 這裡是本專案的**主要測試接縫**：Snapshot + 注入的「現在時間」 → View Model。
 *
 * 「現在時間」是顯式參數而非系統時鐘 —— 因為 Next Session 推導、Session 狀態、
 * Off-season 降級這些行為在真實世界一年只發生一次（見 docs/adr/0004）。
 */
describe('buildViewModel', () => {
  const snapshot = buildFixtureSnapshot();
  const at = (iso: string) => buildViewModel(snapshot, new Date(iso));

  describe('Next Session 推導', () => {
    it('球季進行中，指向下一個尚未開始的場次', () => {
      // 2026-09-10，第 13 站已結束，下一站馬德里的 FP1 在 09-11 11:30Z
      const vm = at('2026-09-10T12:00:00Z');

      expect(vm.nextSession?.session.kind).toBe('fp1');
      expect(vm.nextSession?.weekend.round).toBe(14);
      expect(vm.nextSession?.session.startsAt).toBe('2026-09-11T11:30:00.000Z');
      expect(vm.isOffSeason).toBe(false);
    });

    it('倒數的毫秒數是距離開始的實際時間差', () => {
      const vm = at('2026-09-11T10:30:00Z');
      expect(vm.nextSession?.msUntilStart).toBe(60 * 60 * 1000);
    });

    it('某個場次進行中時，仍指向該場次但標記為 live 且倒數歸零', () => {
      // FP1 11:30Z 開始，慣例時長 60 分鐘
      const vm = at('2026-09-11T12:00:00Z');

      expect(vm.nextSession?.session.kind).toBe('fp1');
      expect(vm.nextSession?.session.status).toBe('live');
      expect(vm.nextSession?.msUntilStart).toBe(0);
    });

    it('該場次結束後跨到當天稍晚的下一個場次', () => {
      const vm = at('2026-09-11T12:31:00Z');

      expect(vm.nextSession?.session.kind).toBe('fp2');
      expect(vm.nextSession?.weekend.round).toBe(14);
    });

    it('當天最後一個場次結束後跨到隔天的第一個場次', () => {
      // FP2 15:00Z 起 60 分鐘，隔天 FP3 在 09-12 10:30Z
      const vm = at('2026-09-11T16:30:00Z');

      expect(vm.nextSession?.session.kind).toBe('fp3');
      expect(vm.nextSession?.session.startsAt).toBe('2026-09-12T10:30:00.000Z');
    });

    it('正賽結束後跨到下一個 Round', () => {
      // 馬德里正賽 09-13 13:00Z 起 120 分鐘
      const vm = at('2026-09-13T15:01:00Z');

      expect(vm.nextSession?.weekend.round).toBe(15);
      expect(vm.nextSession?.session.kind).toBe('fp1');
      expect(vm.focusWeekend?.circuit.id).toBe('baku');
    });

    it('球季開始前指向第一站的第一個場次', () => {
      const vm = at('2026-01-15T00:00:00Z');

      expect(vm.nextSession?.weekend.round).toBe(1);
      expect(vm.nextSession?.session.kind).toBe('fp1');
      expect(vm.isOffSeason).toBe(false);
    });
  });

  describe('Session 狀態', () => {
    it('把場次分為已結束、進行中與未開始', () => {
      // 排位賽 09-12 14:00Z 進行中
      const vm = at('2026-09-12T14:30:00Z');
      const statuses = vm.focusWeekend?.sessions.map((s) => [s.kind, s.status]);

      expect(statuses).toEqual([
        ['fp1', 'finished'],
        ['fp2', 'finished'],
        ['fp3', 'finished'],
        ['qualifying', 'live'],
        ['race', 'upcoming'],
      ]);
    });

    it('由慣例時長推導結束時間，因為 API 不提供', () => {
      const vm = at('2026-09-10T12:00:00Z');
      const race = vm.focusWeekend?.sessions.find((s) => s.kind === 'race');

      // 正賽 13:00Z + 120 分鐘
      expect(race?.endsAt).toBe('2026-09-13T15:00:00.000Z');
    });

    it('開始的那一刻即為進行中', () => {
      const vm = at('2026-09-11T11:30:00Z');
      expect(vm.nextSession?.session.status).toBe('live');
    });

    it('結束的那一刻即為已結束', () => {
      const vm = at('2026-09-11T12:30:00Z');
      expect(vm.nextSession?.session.kind).toBe('fp2');
    });
  });

  describe('Sprint Weekend', () => {
    it('聚焦的週末呈現衝刺賽制的場次組成，不出現 FP2／FP3', () => {
      // 第 17 站新加坡為衝刺賽週末
      const vm = at('2026-10-08T00:00:00Z');

      expect(vm.focusWeekend?.round).toBe(17);
      expect(vm.focusWeekend?.sessions.map((s) => s.kind)).toEqual([
        'fp1',
        'sprintQualifying',
        'sprint',
        'qualifying',
        'race',
      ]);
    });

    it('衝刺賽的慣例時長短於正賽', () => {
      const vm = at('2026-10-08T00:00:00Z');
      const sprint = vm.focusWeekend?.sessions.find((s) => s.kind === 'sprint');

      // 衝刺賽 10-10 09:00Z + 30 分鐘
      expect(sprint?.endsAt).toBe('2026-10-10T09:30:00.000Z');
    });

    it('Next Session 依序推進衝刺賽制的場次，而非退回一般週末的順序', () => {
      // 新加坡：FP1 10-09 08:30Z、衝刺排位 10-09 12:30Z、
      //         衝刺賽 10-10 09:00Z、排位 10-10 13:00Z、正賽 10-11 12:00Z
      expect(at('2026-10-09T10:00:00Z').nextSession?.session.kind).toBe('sprintQualifying');
      expect(at('2026-10-09T13:20:00Z').nextSession?.session.kind).toBe('sprint');
      expect(at('2026-10-10T09:35:00Z').nextSession?.session.kind).toBe('qualifying');
      expect(at('2026-10-10T14:05:00Z').nextSession?.session.kind).toBe('race');
    });

    it('衝刺賽週末進行中時，聚焦的仍是該站而非下一站', () => {
      const vm = at('2026-10-10T09:10:00Z');

      expect(vm.focusWeekend?.round).toBe(17);
      expect(vm.nextSession?.session.kind).toBe('sprint');
      expect(vm.nextSession?.session.status).toBe('live');
    });
  });

  describe('Off-season', () => {
    it('本季最後一場正賽結束後，沒有 Next Session', () => {
      // 阿布達比正賽 12-06 13:00Z 起 120 分鐘
      const vm = at('2026-12-06T15:01:00Z');

      expect(vm.nextSession).toBeNull();
      expect(vm.focusWeekend).toBeNull();
      expect(vm.isOffSeason).toBe(true);
    });

    it('最後一場正賽進行中時尚未進入 Off-season', () => {
      const vm = at('2026-12-06T14:00:00Z');

      expect(vm.isOffSeason).toBe(false);
      expect(vm.nextSession?.session.status).toBe('live');
    });
  });

  describe('賽程表', () => {
    const { weekends } = at('2026-09-10T12:00:00Z');

    it('本季全部 23 站依 Round 排序', () => {
      expect(weekends.map((w) => w.round)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
    });

    it('正賽狀態區分已完賽與未來', () => {
      expect(weekends[12]?.raceStatus).toBe('finished');
      expect(weekends[13]?.raceStatus).toBe('upcoming');
    });

    it('已完賽的站次帶前三名，未來的站次前三名為空', () => {
      expect(weekends[12]?.podium.map((r) => r.driver.id)).toEqual(['antonelli', 'russell', 'max_verstappen']);
      expect(weekends[13]?.podium).toEqual([]);
      expect(weekends[13]?.results).toBeNull();
    });

    it('賽果的車手與車隊參照由 ID 解析而來，帶照片與代表色', () => {
      const winner = weekends[12]?.results?.[0];
      expect(winner?.driver.headshotUrl).toMatch(/^https:/);
      expect(winner?.team.colour).toBe('#00d7b6');
      expect(winner?.driver.familyName).toBe('Antonelli');
    });

    it('賽果指向積分榜沒有的車手時，退回最小物件而非整頁失效', () => {
      const tampered = structuredClone(snapshot);
      tampered.weekends[12]!.results![0]!.driverId = 'ghost';
      const vm = buildViewModel(tampered, new Date('2026-09-10T12:00:00Z'));
      const winner = vm.weekends[12]?.results?.[0];
      expect(winner?.driver.id).toBe('ghost');
      expect(winner?.driver.headshotUrl).toBeNull();
    });

    it('正賽進行中時狀態為 live', () => {
      // 馬德里正賽 09-13 13:00Z 起 120 分鐘
      expect(at('2026-09-13T14:00:00Z').weekends[13]?.raceStatus).toBe('live');
    });
  });

  describe('車隊', () => {
    const { teams } = at('2026-09-10T12:00:00Z');

    it('依名次排序，含積分、勝場與代表色', () => {
      expect(teams.map((t) => t.position)).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
      expect(teams[0]).toMatchObject({ id: 'mercedes', points: 468, wins: 9, colour: '#00d7b6' });
    });

    it('每支車隊底下是它的車手，依車手名次排序', () => {
      const mercedes = teams.find((t) => t.id === 'mercedes');
      expect(mercedes?.drivers.map((d) => d.driver.id)).toEqual(['antonelli', 'russell']);
      expect(mercedes?.drivers[0]).toMatchObject({ position: 1, points: 267, wins: 7 });
    });

    it('每位車手恰好出現在一支車隊底下', () => {
      const all = teams.flatMap((t) => t.drivers.map((d) => d.driver.id));
      expect(all).toHaveLength(23);
      expect(new Set(all).size).toBe(23);
    });

    it('車隊資料不隨時間改變 —— Off-season 時依然完整', () => {
      expect(at('2026-12-31T00:00:00Z').teams).toHaveLength(11);
    });
  });

  describe('車手', () => {
    const { drivers } = at('2026-09-10T12:00:00Z');

    it('依名次排序，帶當前車隊、積分、勝場與頒獎台', () => {
      expect(drivers.map((d) => d.position)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
      expect(drivers[0]).toMatchObject({ position: 1, points: 267, wins: 7, podiums: 11 });
      expect(drivers[0]?.driver.id).toBe('antonelli');
      expect(drivers[0]?.team?.id).toBe('mercedes');
      expect(drivers[0]?.team?.colour).toBe('#00d7b6');
    });

    it('每位車手都有當前車隊', () => {
      expect(drivers.filter((d) => d.team === null)).toEqual([]);
    });
  });

  describe('賽道', () => {
    const { circuits } = at('2026-09-10T12:00:00Z');

    it('本季 23 站對應 23 條不同賽道', () => {
      expect(circuits).toHaveLength(23);
      expect(new Set(circuits.map((c) => c.circuit.id)).size).toBe(23);
    });

    it('依本季首次出現的 Round 排序，並帶該站的名稱', () => {
      expect(circuits[0]?.circuit.id).toBe('albert_park');
      expect(circuits[0]?.weekends).toEqual([{ round: 1, name: 'Australian Grand Prix' }]);
      expect(circuits.find((c) => c.circuit.id === 'madring')?.weekends).toEqual([
        { round: 14, name: 'Spanish Grand Prix' },
      ]);
    });
  });

  it('保留球季與抓取時間供畫面標示資料新鮮度', () => {
    const vm = at('2026-09-10T12:00:00Z');

    expect(vm.season).toBe('2026');
    expect(vm.fetchedAt).toBe('2026-09-10T00:00:00.000Z');
  });
});
