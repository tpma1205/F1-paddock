import { describe, expect, it } from 'vitest';
import { bundledSnapshot } from './snapshot.ts';
import { CIRCUIT_PROFILES, DRIVER_PROFILES, TEAM_PROFILES } from './profiles.ts';
import { TEAM_NAMES } from './localisation.ts';

const teamIds = new Set(bundledSnapshot.teamStandings.map((s) => s.team.id));
const driverIds = new Set(bundledSnapshot.driverStandings.map((s) => s.driver.id));
const circuitIds = new Set(bundledSnapshot.weekends.map((w) => w.circuit.id));

/** 缺 Profile 只警告：換季時新車手不該擋住部署。 */
const warnMissing = (kind: string, ids: Set<string>, table: Record<string, unknown>): void => {
  const missing = [...ids].filter((id) => !(id in table));
  if (missing.length > 0) console.warn(`⚠ ${kind} 缺 Profile（${missing.length}）：${missing.join(', ')}`);
};

describe('Profile 資料表', () => {
  it('每個鍵都對到本季存在的實體 —— 打錯 ID 立刻失敗', () => {
    expect(Object.keys(TEAM_PROFILES).filter((id) => !teamIds.has(id))).toEqual([]);
    expect(Object.keys(DRIVER_PROFILES).filter((id) => !driverIds.has(id))).toEqual([]);
    expect(Object.keys(CIRCUIT_PROFILES).filter((id) => !circuitIds.has(id))).toEqual([]);
  });

  it('本季實體缺 Profile 時列出清單（警告，不失敗）', () => {
    warnMissing('車隊', teamIds, TEAM_PROFILES);
    warnMissing('車手', driverIds, DRIVER_PROFILES);
    warnMissing('賽道', circuitIds, CIRCUIT_PROFILES);
  });

  it('文字遵守規範：2–4 句、不寫「目前」這種會過期的字眼', () => {
    const intros = [
      ...Object.values(TEAM_PROFILES),
      ...Object.values(DRIVER_PROFILES),
      ...Object.values(CIRCUIT_PROFILES),
    ].map((p) => p.intro);
    for (const intro of intros) {
      const sentences = intro.split('。').filter((s) => s.trim().length > 0);
      expect(sentences.length, intro).toBeGreaterThanOrEqual(2);
      expect(sentences.length, intro).toBeLessThanOrEqual(4);
      expect(intro, intro).not.toMatch(/目前|現在是|現正|今年|本季積分|積分榜第|排名第/);
    }
  });

  it('車隊簡介的專有名詞遵守譯名表（不出現非台灣譯名）', () => {
    const banned = ['邁凱倫', '梅賽德斯', '阿斯頓馬丁', '梅塞德斯'];
    for (const [id, profile] of Object.entries(TEAM_PROFILES)) {
      for (const word of banned) expect(profile.intro, id).not.toContain(word);
      expect(profile.base.length, id).toBeGreaterThan(0);
      expect(profile.powerUnit.length, id).toBeGreaterThan(0);
    }
    // 譯名表裡的每支車隊在文字裡若被提到，用的是譯名
    expect(TEAM_NAMES['mclaren']?.zh).toBe('麥拉倫');
  });
});
