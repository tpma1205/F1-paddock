import { describe, expect, it } from 'vitest';
import { bundledSnapshot } from './snapshot.ts';
import {
  DRIVER_NAMES,
  RACE_WEEKEND_NAMES,
  localisedCircuit,
  localisedDriver,
  localisedRaceWeekend,
  localisedTeam,
} from './localisation.ts';

describe('中英對照表', () => {
  describe('涵蓋率 —— 本季每一個實體都要有中文名', () => {
    it('涵蓋全部車隊', () => {
      const missing = bundledSnapshot.teamStandings
        .map((standing) => standing.team)
        .filter((team) => localisedTeam(team.id) === null)
        .map((team) => `${team.id} (${team.name})`);

      expect(missing).toEqual([]);
    });

    it('涵蓋全部車手', () => {
      const missing = bundledSnapshot.driverStandings
        .map((standing) => standing.driver)
        .filter((driver) => localisedDriver(driver.id) === null)
        .map((driver) => `${driver.id} (${driver.familyName})`);

      expect(missing).toEqual([]);
    });

    it('涵蓋全部賽道', () => {
      const missing = bundledSnapshot.weekends
        .map((weekend) => weekend.circuit)
        .filter((circuit) => localisedCircuit(circuit.id) === null)
        .map((circuit) => `${circuit.id} (${circuit.name})`);

      expect(missing).toEqual([]);
    });

    it('涵蓋全部大獎賽名稱', () => {
      const missing = bundledSnapshot.weekends
        .map((weekend) => weekend.name)
        .filter((raceName) => localisedRaceWeekend(raceName) === null);

      expect(missing).toEqual([]);
    });
  });

  describe('降級', () => {
    it('查無資料時回傳 null，讓畫面只顯示英文而非空白或報錯', () => {
      expect(localisedTeam('nonexistent_team')).toBeNull();
      expect(localisedDriver('nonexistent_driver')).toBeNull();
      expect(localisedCircuit('nonexistent_circuit')).toBeNull();
      expect(localisedRaceWeekend('Atlantis Grand Prix')).toBeNull();
    });
  });

  describe('譯名原則', () => {
    it('採台灣慣用譯名，不採中國譯名', () => {
      expect(localisedTeam('mclaren')?.zh).toBe('麥拉倫');
      expect(localisedTeam('mercedes')?.zh).toBe('賓士');
      expect(localisedTeam('aston_martin')?.zh).toBe('奧斯頓馬丁');
    });

    it('日本車手使用漢字本名而非音譯', () => {
      expect(localisedDriver('tsunoda')?.zh).toBe('角田裕毅');
    });

    it('尚無公認譯名者標記為暫定', () => {
      expect(localisedCircuit('madring')?.provisional).toBe(true);
      expect(localisedDriver('arvid_lindblad')?.provisional).toBe(true);
    });

    it('已有公認譯名者不標記暫定', () => {
      expect(localisedDriver('hamilton')?.provisional).toBeUndefined();
      expect(localisedCircuit('monza')?.provisional).toBeUndefined();
    });

    it('沒有任何一筆譯名是空的', () => {
      const tables = [DRIVER_NAMES, RACE_WEEKEND_NAMES];
      for (const table of tables) {
        for (const [key, value] of Object.entries(table)) {
          expect(value.zh.trim(), `${key} 的譯名為空`).not.toBe('');
        }
      }
    });
  });

  describe('鍵的選擇', () => {
    it('大獎賽以英文名為鍵，因為同一國可能有兩場', () => {
      // 2026 年西班牙有兩場：第 7 站巴塞隆納、第 14 站馬德里
      expect(localisedRaceWeekend('Barcelona Grand Prix')?.zh).toBe('巴塞隆納大獎賽');
      expect(localisedRaceWeekend('Spanish Grand Prix')?.zh).toBe('西班牙大獎賽');
    });

    it('掛名與舉辦地不符時，譯名註明實際地點', () => {
      // 巴林大獎賽卻在雪邦舉行，直譯會讓人以為辦在巴林
      expect(localisedRaceWeekend('Bahrain Grand Prix in Malaysia')?.zh).toContain('馬來西亞');
    });
  });
});
