import type { ViewModel } from './types.ts';

/** 路徑導覽的一段；`href` 為 null 表示目前頁面（不可點）。 */
export interface Crumb {
  label: string;
  href: string | null;
}

/** 譯名查詢 —— 由呼叫端注入，domain 層不依賴對照表本身。 */
export interface Localiser {
  team: (id: string) => string | null;
  driver: (id: string) => string | null;
  circuit: (id: string) => string | null;
  raceWeekend: (name: string) => string | null;
}

const HOME: Crumb = { label: '首頁', href: '/' };
const NOT_FOUND = '找不到';

/** 列表頁的標題與路徑 —— 實體頁的上一層。 */
const SECTIONS: Record<string, string> = {
  calendar: '賽程',
  teams: '車隊',
  drivers: '車手',
  circuits: '賽道',
  races: '賽程', // 單站的上一層是賽程表，不是「/races」列表（沒有這個頁面）
};
const SECTION_HREF: Record<string, string> = {
  calendar: '/calendar',
  teams: '/teams',
  drivers: '/drivers',
  circuits: '/circuits',
  races: '/calendar',
};

/** 實體段的顯示文字：中文譯名，沒有就英文正式名稱；找不到實體為 null。 */
const entityLabel = (section: string, id: string, vm: ViewModel, l: Localiser): string | null => {
  switch (section) {
    case 'teams': {
      const team = vm.teams.find((t) => t.id === id);
      return team ? (l.team(id) ?? team.name) : null;
    }
    case 'drivers': {
      const entry = vm.drivers.find((d) => d.driver.id === id);
      return entry ? (l.driver(id) ?? `${entry.driver.givenName} ${entry.driver.familyName}`) : null;
    }
    case 'circuits': {
      const entry = vm.circuits.find((c) => c.circuit.id === id);
      return entry ? (l.circuit(id) ?? entry.circuit.name) : null;
    }
    case 'races': {
      const weekend = vm.weekends.find((w) => String(w.round) === id);
      return weekend ? (l.raceWeekend(weekend.name) ?? weekend.name) : null;
    }
    default:
      return null;
  }
};

/**
 * 由路徑推出路徑導覽的段落鏈。**各頁面不自行拼字串**——段落規則只寫在這裡，
 * 新增一種路由時補這裡與 routes.ts 即可（有測試掃描全部路由確保沒漏）。
 *
 * 首頁回傳空陣列（不渲染）。
 */
export const breadcrumbFor = (pathname: string, viewModel: ViewModel, localiser: Localiser): Crumb[] => {
  const [section, id, ...rest] = pathname.split('/').filter(Boolean);
  if (!section) return [];

  const sectionLabel = SECTIONS[section];
  const sectionHref = SECTION_HREF[section];
  if (!sectionLabel || !sectionHref || rest.length > 0) return [HOME, { label: NOT_FOUND, href: null }];

  if (id === undefined) return [HOME, { label: sectionLabel, href: null }];

  const label = entityLabel(section, id, viewModel, localiser);
  return [HOME, { label: sectionLabel, href: sectionHref }, { label: label ?? NOT_FOUND, href: null }];
};
