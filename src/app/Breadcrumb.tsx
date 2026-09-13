import type { JSX } from 'react';
import { Link, useLocation } from 'react-router';
import { breadcrumbFor, type Localiser } from '../domain/breadcrumb.ts';
import type { ViewModel } from '../domain/types.ts';
import { localisedCircuit, localisedDriver, localisedRaceWeekend, localisedTeam } from '../data/localisation.ts';

const localiser: Localiser = {
  team: (id) => localisedTeam(id)?.zh ?? null,
  driver: (id) => localisedDriver(id)?.zh ?? null,
  circuit: (id) => localisedCircuit(id)?.zh ?? null,
  raceWeekend: (name) => localisedRaceWeekend(name)?.zh ?? null,
};

interface BreadcrumbProps {
  viewModel: ViewModel;
}

/**
 * 路徑導覽：「首頁 / 車手 / 安東內利」。段落由 domain 的 breadcrumbFor 決定，
 * 這裡只負責渲染；首頁不出現。
 */
export const Breadcrumb = ({ viewModel }: BreadcrumbProps): JSX.Element | null => {
  const { pathname } = useLocation();
  const crumbs = breadcrumbFor(pathname, viewModel, localiser);
  if (crumbs.length === 0) return null;

  return (
    <nav className="breadcrumb" aria-label="路徑導覽">
      <ol className="breadcrumb__list">
        {crumbs.map((crumb, i) => (
          <li key={i} className="breadcrumb__item">
            {crumb.href === null ? (
              <span aria-current="page">{crumb.label}</span>
            ) : (
              <Link to={crumb.href}>{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
