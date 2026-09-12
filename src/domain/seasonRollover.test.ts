import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFixtureSnapshot } from '../data/__fixtures__/buildFixtureSnapshot.ts';
import { buildViewModel } from './viewModel.ts';
import type { Snapshot } from './types.ts';

/**
 * 換季行為 —— 這些情境在真實世界一年只發生一次，本地永遠測不到
 * （docs/adr/0004 記下的陷阱），所以全部以注入時間 + 合成的下一季快照驗證。
 */

const season2026 = buildFixtureSnapshot();

/** 把整份快照往後推一年：只留賽程，沒有積分與賽果 —— 這就是新球季剛公布時的樣子。 */
const shiftYear = (snapshot: Snapshot, years: number): Snapshot => {
  const shift = (iso: string) => {
    const d = new Date(iso);
    d.setUTCFullYear(d.getUTCFullYear() + years);
    return d.toISOString();
  };
  return {
    ...snapshot,
    season: String(Number(snapshot.season) + years),
    completedRound: null,
    weekends: snapshot.weekends.map((w) => ({
      ...w,
      sessions: w.sessions.map((s) => ({ ...s, startsAt: shift(s.startsAt) })),
      results: null,
      sprintResults: null,
      qualifying: null,
    })),
    driverStandings: [],
    teamStandings: [],
  };
};

const season2027 = shiftYear(season2026, 1);

describe('換季', () => {
  it('球季進行中，即使下一季賽程已公布也不提前切換', () => {
    const vm = buildViewModel([season2027, season2026], new Date('2026-09-10T12:00:00Z'));
    expect(vm.season).toBe('2026');
    expect(vm.standingsSeason).toBe('2026');
    expect(vm.nextSession?.weekend.round).toBe(14);
  });

  it('本季最後一場結束後，賽程與倒數自動指向下一季開幕', () => {
    // 2026 阿布達比正賽 12-06 13:00Z + 120 分鐘
    const vm = buildViewModel([season2026, season2027], new Date('2026-12-07T00:00:00Z'));
    expect(vm.season).toBe('2027');
    expect(vm.isOffSeason).toBe(false);
    expect(vm.nextSession?.weekend.round).toBe(1);
    expect(vm.nextSession?.session.kind).toBe('fp1');
    expect(vm.nextSession?.session.startsAt).toBe('2027-03-06T01:30:00.000Z');
    expect(vm.nextSession!.msUntilStart).toBeGreaterThan(0);
  });

  it('下一季尚無積分時，積分區塊回退為上一季最終結果並明確標示年份', () => {
    const vm = buildViewModel([season2026, season2027], new Date('2027-01-15T00:00:00Z'));
    expect(vm.season).toBe('2027');
    expect(vm.standingsSeason).toBe('2026');
    expect(vm.standingsAreFinal).toBe(true);
    expect(vm.drivers[0]?.driver.id).toBe('antonelli');
    expect(vm.teams).toHaveLength(11);
    // 走勢與亮點也跟著積分那一季
    expect(vm.progression.rounds).toHaveLength(13);
    expect(vm.highlights.mostWins?.driver.id).toBe('antonelli');
  });

  it('下一季首站結束、有了積分之後，自動切回即時資料', () => {
    const afterRound1: Snapshot = {
      ...season2027,
      completedRound: 1,
      driverStandings: season2026.driverStandings.slice(0, 3).map((s, i) => ({
        ...s,
        position: i + 1,
        points: 25 - i * 7,
        wins: i === 0 ? 1 : 0,
        podiums: 1,
      })),
      teamStandings: season2026.teamStandings.slice(0, 2),
    };
    const vm = buildViewModel([season2026, afterRound1], new Date('2027-03-10T00:00:00Z'));
    expect(vm.season).toBe('2027');
    expect(vm.standingsSeason).toBe('2027');
    expect(vm.standingsAreFinal).toBe(false);
    expect(vm.drivers[0]?.points).toBe(25);
  });

  it('本季結束且下一季賽程尚未公布：Off-season，不顯示負數倒數', () => {
    const vm = buildViewModel([season2026], new Date('2026-12-07T00:00:00Z'));
    expect(vm.season).toBe('2026');
    expect(vm.isOffSeason).toBe(true);
    expect(vm.nextSession).toBeNull();
    // 積分仍是本季最終，標示為最終
    expect(vm.standingsSeason).toBe('2026');
    expect(vm.standingsAreFinal).toBe(true);
  });

  it('快照的順序不影響結果', () => {
    const a = buildViewModel([season2026, season2027], new Date('2027-01-15T00:00:00Z'));
    const b = buildViewModel([season2027, season2026], new Date('2027-01-15T00:00:00Z'));
    expect(a.season).toBe(b.season);
    expect(a.standingsSeason).toBe(b.standingsSeason);
  });

  it('沒有任何快照時拋出明確錯誤，而非回傳空畫面', () => {
    expect(() => buildViewModel([], new Date())).toThrow(/快照/);
  });
});

/**
 * ADR-0004：程式中不得寫死年份。掃描產品程式碼（不含測試、fixture 與資料檔）。
 * 資料檔（賽道單圈紀錄的年份、對照表）與 CDN 資產版本目錄是合法的例外，
 * 各自在檔內註明理由。
 */
describe('不寫死年份', () => {
  const ROOT = fileURLToPath(new URL('../../', import.meta.url));
  const SCAN = ['src/domain', 'src/app', 'src/pages', 'src/App.tsx', 'src/main.tsx', 'scripts'];
  const ALLOWED = new Set(['src/app/teamAssets.ts']); // LOGO_ASSET_VERSION：CDN 資產目錄，非賽季

  const walk = (relative: string): string[] => {
    const full = join(ROOT, relative);
    if (statSync(full).isFile()) return [relative];
    return readdirSync(full).flatMap((name) => walk(`${relative}/${name}`));
  };

  const files = SCAN.flatMap(walk).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts') && !ALLOWED.has(f),
  );

  it.each(files)('%s 不含四位數年份', (file) => {
    const source = readFileSync(join(ROOT, file), 'utf8');
    // 只抓看起來像年份的 19xx／20xx，且不在註解列內（註解裡可以舉例）
    const codeLines = source.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
    const hits = codeLines.filter((line) => /\b(19|20)\d{2}\b/.test(line));
    expect(hits, hits.join('\n')).toEqual([]);
  });
});
