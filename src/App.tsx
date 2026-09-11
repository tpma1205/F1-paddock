import { useMemo, type JSX } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router';
import { bundledSnapshot } from './data/snapshot.ts';
import { buildViewModel } from './domain/viewModel.ts';
import { useNow } from './app/useNow.ts';
import { formatFetchedAt, formatTimeZoneLabel, resolveTimeZone } from './app/formatting.ts';
import { ScrollProgress } from './app/ScrollProgress.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { TeamsPage } from './pages/TeamsPage.tsx';
import { TeamPage } from './pages/TeamPage.tsx';
import { DriversPage } from './pages/DriversPage.tsx';
import { DriverPage } from './pages/DriverPage.tsx';
import { CircuitsPage } from './pages/CircuitsPage.tsx';
import { CircuitPage } from './pages/CircuitPage.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { RacePage } from './pages/RacePage.tsx';

/**
 * 路由的 basename 取自 Vite 的 base（`/f1-paddock/`），不另外寫一份 ——
 * 兩者不一致時 GitHub Pages 上所有連結都會壞（見 docs/adr/0002）。
 */
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export const App = (): JSX.Element => {
  const now = useNow();
  const timeZone = useMemo(resolveTimeZone, []);
  const viewModel = useMemo(() => buildViewModel(bundledSnapshot, now), [now]);
  const timeZoneLabel = formatTimeZoneLabel(now, timeZone);
  const nextRound = viewModel.nextSession?.weekend.round ?? null;
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

        <main>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage viewModel={viewModel} timeZone={timeZone} timeZoneLabel={timeZoneLabel} />
              }
            />
            <Route
              path="/teams"
              element={<TeamsPage season={viewModel.season} teams={viewModel.teams} />}
            />
            <Route
              path="/teams/:teamId"
              element={<TeamPage season={viewModel.season} teams={viewModel.teams} />}
            />
            <Route
              path="/drivers"
              element={<DriversPage season={viewModel.season} drivers={viewModel.drivers} />}
            />
            <Route
              path="/drivers/:driverId"
              element={<DriverPage season={viewModel.season} drivers={viewModel.drivers} />}
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
                  nowMs={now.getTime()}
                  timeZone={timeZone}
                />
              }
            />
            <Route
              path="/races/:round"
              element={
                <RacePage
                  season={viewModel.season}
                  weekends={viewModel.weekends}
                  nextRound={nextRound}
                  msUntilNext={msUntilNext}
                  timeZone={timeZone}
                  timeZoneLabel={timeZoneLabel}
                />
              }
            />
          </Routes>
        </main>

        <footer className="meta">
          <span>{timeZoneLabel}</span>
          <span>資料更新於 {formatFetchedAt(viewModel.fetchedAt, timeZone)}</span>
        </footer>
      </div>
    </BrowserRouter>
  );
};
