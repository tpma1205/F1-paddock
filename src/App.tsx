import { Suspense, lazy, useMemo, type JSX } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router';
import { bundledSnapshots } from './data/snapshot.ts';
import { buildViewModel } from './domain/viewModel.ts';
import { useNow } from './app/useNow.ts';
import { formatFetchedAt, formatTimeZoneLabel, resolveTimeZone } from './app/formatting.ts';
import { ScrollProgress } from './app/ScrollProgress.tsx';
import { Breadcrumb } from './app/Breadcrumb.tsx';
import { HomePage } from './pages/HomePage.tsx';

/**
 * 內頁以路由為單位延遲載入 —— 首頁是入口、不延遲；其餘頁面各自成一個 chunk，
 * 使用者沒點到的頁面就不下載。
 */
const TeamsPage = lazy(() => import('./pages/TeamsPage.tsx').then((m) => ({ default: m.TeamsPage })));
const TeamPage = lazy(() => import('./pages/TeamPage.tsx').then((m) => ({ default: m.TeamPage })));
const DriversPage = lazy(() => import('./pages/DriversPage.tsx').then((m) => ({ default: m.DriversPage })));
const DriverPage = lazy(() => import('./pages/DriverPage.tsx').then((m) => ({ default: m.DriverPage })));
const CircuitsPage = lazy(() => import('./pages/CircuitsPage.tsx').then((m) => ({ default: m.CircuitsPage })));
const CircuitPage = lazy(() => import('./pages/CircuitPage.tsx').then((m) => ({ default: m.CircuitPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage.tsx').then((m) => ({ default: m.CalendarPage })));
const RacePage = lazy(() => import('./pages/RacePage.tsx').then((m) => ({ default: m.RacePage })));

/**
 * 路由的 basename 取自 Vite 的 base（`/F1-paddock/`），不另外寫一份 ——
 * 兩者不一致時 GitHub Pages 上所有連結都會壞（見 docs/adr/0002）。
 */
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export const App = (): JSX.Element => {
  const now = useNow();
  const timeZone = useMemo(resolveTimeZone, []);
  const viewModel = useMemo(() => buildViewModel(bundledSnapshots, now), [now]);
  const timeZoneLabel = formatTimeZoneLabel(now, timeZone);
  const nextRound = viewModel.nextSession?.weekend.round ?? null;
  const nextSessionKind = viewModel.nextSession?.session.kind ?? null;
  const msUntilNext = viewModel.nextSession?.msUntilStart ?? 0;

  return (
    <BrowserRouter basename={BASENAME}>
      <ScrollProgress />
      <div className="page">
        <header className="topbar">
          <NavLink to="/" className="brand" end>
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__name">F1 PADDOCK</span>
          </NavLink>
          <nav className="nav" aria-label="主要導覽">
            <NavLink to="/" end>
              首頁
            </NavLink>
            <NavLink to="/calendar">賽程</NavLink>
            <NavLink to="/teams">車隊</NavLink>
            <NavLink to="/drivers">車手</NavLink>
            <NavLink to="/circuits">賽道</NavLink>
          </nav>
        </header>

        <Breadcrumb viewModel={viewModel} />

        <main>
          <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
            <Routes>
            <Route
              path="/"
              element={
                <HomePage viewModel={viewModel} timeZone={timeZone} timeZoneLabel={timeZoneLabel} />
              }
            />
            <Route
              path="/teams"
              element={<TeamsPage season={viewModel.standingsSeason} teams={viewModel.teams} />}
            />
            <Route
              path="/teams/:teamId"
              element={
                <TeamPage season={viewModel.standingsSeason} teams={viewModel.teams} battles={viewModel.battles} />
              }
            />
            <Route
              path="/drivers"
              element={<DriversPage season={viewModel.standingsSeason} drivers={viewModel.drivers} />}
            />
            <Route
              path="/drivers/:driverId"
              element={<DriverPage season={viewModel.standingsSeason} drivers={viewModel.drivers} />}
            />
            <Route
              path="/circuits"
              element={<CircuitsPage season={viewModel.season} circuits={viewModel.circuits} />}
            />
            <Route
              path="/circuits/:circuitId"
              element={<CircuitPage season={viewModel.season} circuits={viewModel.circuits} />}
            />
            <Route
              path="/calendar"
              element={
                <CalendarPage
                  season={viewModel.season}
                  weekends={viewModel.weekends}
                  nextRound={nextRound}
                  timeZone={timeZone}
                  fetchedAt={viewModel.fetchedAt}
                />
              }
            />
            <Route
              path="/races/:round"
              element={
                <RacePage
                  viewModel={viewModel}
                  nextRound={nextRound}
                  nextSessionKind={nextSessionKind}
                  msUntilNext={msUntilNext}
                  timeZone={timeZone}
                  timeZoneLabel={timeZoneLabel}
                />
              }
            />
            </Routes>
          </Suspense>
        </main>

        <footer className="meta">
          <span>{timeZoneLabel}</span>
          <span>資料更新於 {formatFetchedAt(viewModel.fetchedAt, timeZone)}</span>
        </footer>
      </div>
    </BrowserRouter>
  );
};
