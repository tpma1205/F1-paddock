import { normaliseSeason } from '../jolpica.ts';
import type { Snapshot } from '../../domain/types.ts';
import races from './jolpica-races.json' with { type: 'json' };
import driverStandings from './jolpica-driver-standings.json' with { type: 'json' };
import teamStandings from './jolpica-constructor-standings.json' with { type: 'json' };
import openF1Drivers from './openf1-drivers.json' with { type: 'json' };
import resultsPage1 from './jolpica-results-page1.json' with { type: 'json' };
import resultsPage2 from './jolpica-results-page2.json' with { type: 'json' };
import resultsPage3 from './jolpica-results-page3.json' with { type: 'json' };

/**
 * 由錄製的真實 Jolpica 回應建出 Snapshot。
 *
 * 這是測試唯一的資料入口 —— 測試不打真實網路（見 docs/spec/0001）。
 * 錄製時間點：2026 賽季第 13 站（義大利 GP）結束後。
 */
export const buildFixtureSnapshot = (): Snapshot =>
  normaliseSeason({
    races,
    driverStandings,
    teamStandings,
    openF1Drivers,
    results: [resultsPage1, resultsPage2, resultsPage3],
    fetchedAt: '2026-09-10T00:00:00.000Z',
  });
