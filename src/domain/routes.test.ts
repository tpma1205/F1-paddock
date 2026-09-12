import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildFixtureSnapshot } from '../data/__fixtures__/buildFixtureSnapshot.ts';
import { buildViewModel } from './viewModel.ts';
import { routesFor } from './routes.ts';

const snapshot = buildFixtureSnapshot();
const viewModel = buildViewModel([snapshot], new Date('2026-09-10T12:00:00Z'));
const routes = routesFor(viewModel);

describe('routesFor —— 建置期產生實體 HTML 的依據', () => {
  it('快照中的每一個實體都有對應路由', () => {
    for (const standing of snapshot.teamStandings) {
      expect(routes).toContain(`/teams/${standing.team.id}`);
    }
    for (const standing of snapshot.driverStandings) {
      expect(routes).toContain(`/drivers/${standing.driver.id}`);
    }
    for (const weekend of snapshot.weekends) {
      expect(routes).toContain(`/circuits/${weekend.circuit.id}`);
      expect(routes).toContain(`/races/${weekend.round}`);
    }
  });

  it('含所有靜態列表頁', () => {
    expect(routes).toEqual(expect.arrayContaining(['/', '/calendar', '/teams', '/drivers', '/circuits']));
  });

  it('沒有重複，且都以 / 開頭、不以 / 結尾', () => {
    expect(new Set(routes).size).toBe(routes.length);
    for (const route of routes) {
      expect(route.startsWith('/')).toBe(true);
      if (route !== '/') expect(route.endsWith('/')).toBe(false);
    }
  });

  it('數量符合：5 靜態 + 11 車隊 + 23 車手 + 23 賽道 + 23 站', () => {
    expect(routes).toHaveLength(5 + 11 + 23 + 23 + 23);
  });

  /**
   * 守住 ADR-0002 的陷阱的另一半：routesFor 產出的每一種形狀，App.tsx 都要有
   * 對應的 <Route>；反之 App.tsx 的每個 path 也都要被 routesFor 涵蓋。
   * 兩邊任一邊新增而另一邊忘了，這條就紅。
   */
  it('路由形狀與 App.tsx 的 <Route path> 一一對應', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    const declared = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]!);

    // 把具體路由化約回 App.tsx 的參數形狀
    const shapes = new Set(
      routes.map((route) =>
        route
          .replace(/^\/teams\/[^/]+$/, '/teams/:teamId')
          .replace(/^\/drivers\/[^/]+$/, '/drivers/:driverId')
          .replace(/^\/circuits\/[^/]+$/, '/circuits/:circuitId')
          .replace(/^\/races\/[^/]+$/, '/races/:round'),
      ),
    );

    expect([...shapes].sort()).toEqual([...declared].sort());
  });
});
