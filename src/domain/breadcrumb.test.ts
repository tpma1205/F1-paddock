import { describe, expect, it } from 'vitest';
import { buildFixtureSnapshot } from '../data/__fixtures__/buildFixtureSnapshot.ts';
import { breadcrumbFor, type Localiser } from './breadcrumb.ts';
import { routesFor } from './routes.ts';
import { buildViewModel } from './viewModel.ts';

const snapshot = buildFixtureSnapshot();
const viewModel = buildViewModel([snapshot], new Date('2026-09-10T12:00:00Z'));

const localiser: Localiser = {
  team: (id) => (id === 'mercedes' ? '賓士' : null),
  driver: (id) => (id === 'antonelli' ? '安東內利' : null),
  circuit: (id) => (id === 'madring' ? '馬德里賽道' : null),
  raceWeekend: (name) => (name === 'Spanish Grand Prix' ? '西班牙大獎賽' : null),
};

describe('breadcrumbFor —— 路徑導覽的段落鏈', () => {
  it('首頁沒有 Breadcrumb', () => {
    expect(breadcrumbFor('/', viewModel, localiser)).toEqual([]);
  });

  it('列表頁是「首頁 / 車手」，末段不可點', () => {
    expect(breadcrumbFor('/drivers', viewModel, localiser)).toEqual([
      { label: '首頁', href: '/' },
      { label: '車手', href: null },
    ]);
  });

  it('實體頁末段用中文譯名', () => {
    expect(breadcrumbFor('/drivers/antonelli', viewModel, localiser)).toEqual([
      { label: '首頁', href: '/' },
      { label: '車手', href: '/drivers' },
      { label: '安東內利', href: null },
    ]);
    expect(breadcrumbFor('/teams/mercedes', viewModel, localiser).at(-1)?.label).toBe('賓士');
    expect(breadcrumbFor('/circuits/madring', viewModel, localiser).at(-1)?.label).toBe('馬德里賽道');
  });

  it('沒有譯名時回退英文正式名稱', () => {
    expect(breadcrumbFor('/drivers/russell', viewModel, localiser).at(-1)?.label).toBe('George Russell');
    expect(breadcrumbFor('/teams/ferrari', viewModel, localiser).at(-1)?.label).toBe('Ferrari');
  });

  it('單站頁是「首頁 / 賽程 / 大獎賽譯名」', () => {
    expect(breadcrumbFor('/races/14', viewModel, localiser)).toEqual([
      { label: '首頁', href: '/' },
      { label: '賽程', href: '/calendar' },
      { label: '西班牙大獎賽', href: null },
    ]);
  });

  it('找不到的實體或未知路徑：只到上一層，末段標「找不到」', () => {
    expect(breadcrumbFor('/drivers/nobody', viewModel, localiser).at(-1)?.label).toBe('找不到');
    expect(breadcrumbFor('/whatever', viewModel, localiser)).toEqual([
      { label: '首頁', href: '/' },
      { label: '找不到', href: null },
    ]);
  });

  it('routesFor 的每一條路由都有段落鏈，且除首頁外末段非空、其餘段可點', () => {
    for (const route of routesFor(viewModel)) {
      const crumbs = breadcrumbFor(route, viewModel, localiser);
      if (route === '/') {
        expect(crumbs).toEqual([]);
        continue;
      }
      expect(crumbs.length, route).toBeGreaterThanOrEqual(2);
      expect(crumbs[0]).toEqual({ label: '首頁', href: '/' });
      for (const crumb of crumbs.slice(0, -1)) expect(crumb.href, route).not.toBeNull();
      const last = crumbs.at(-1)!;
      expect(last.href).toBeNull();
      expect(last.label.length, route).toBeGreaterThan(0);
      expect(last.label, route).not.toBe('找不到');
    }
  });
});
