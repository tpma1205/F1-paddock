import type { ViewModel } from './types.ts';

/** 靜態路由 —— 不依資料變動的頁面。 */
const STATIC_ROUTES = ['/', '/calendar', '/teams', '/drivers', '/circuits'] as const;

/**
 * 本站所有可直接開啟的路由。
 *
 * 這是**建置期產生實體 HTML 的唯一依據**（見 docs/adr/0002）：GitHub Pages
 * 是純靜態伺服器，只有列在這裡的路徑才會有對應的 index.html。由 View Model
 * 推導而非另外硬編，新增一種實體時路由自然跟著出現，不會出現「頁面做了、
 * 直接開卻 404」的落差。
 *
 * 路由的形狀必須與 App.tsx 的 <Route> 一致 —— 有測試守著兩邊。
 */
export const routesFor = (viewModel: ViewModel): string[] => {
  const dynamic = [
    ...viewModel.teams.map((team) => `/teams/${team.id}`),
    ...viewModel.drivers.map((entry) => `/drivers/${entry.driver.id}`),
    ...viewModel.circuits.map((entry) => `/circuits/${entry.circuit.id}`),
    ...viewModel.weekends.map((weekend) => `/races/${weekend.round}`),
  ];

  return [...STATIC_ROUTES, ...dynamic];
};
