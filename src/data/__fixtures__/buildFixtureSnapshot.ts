import { normaliseSeason, normaliseTimedResults, type NormaliseInput } from '../jolpica.ts';
import type { RawOpenF1SessionResult } from '../openf1.ts';
import type { TimedResults } from '../../domain/types.ts';
import type { Snapshot } from '../../domain/types.ts';
import races from './jolpica-races.json' with { type: 'json' };
import driverStandings from './jolpica-driver-standings.json' with { type: 'json' };
import teamStandings from './jolpica-constructor-standings.json' with { type: 'json' };
import openF1Drivers from './openf1-drivers.json' with { type: 'json' };
import resultsPage1 from './jolpica-results-page1.json' with { type: 'json' };
import resultsPage2 from './jolpica-results-page2.json' with { type: 'json' };
import resultsPage3 from './jolpica-results-page3.json' with { type: 'json' };
import sprintPage1 from './jolpica-sprint-page1.json' with { type: 'json' };
import sprintPage2 from './jolpica-sprint-page2.json' with { type: 'json' };
import qualifyingPage1 from './jolpica-qualifying-page1.json' with { type: 'json' };
import qualifyingPage2 from './jolpica-qualifying-page2.json' with { type: 'json' };
import qualifyingPage3 from './jolpica-qualifying-page3.json' with { type: 'json' };
import openF1Sessions from './openf1-sessions.json' with { type: 'json' };
import openF1Fp1 from './openf1-session-result-fp1.json' with { type: 'json' };
import openF1Sq from './openf1-session-result-sq.json' with { type: 'json' };
import openF1MeetingDrivers from './openf1-drivers-meeting.json' with { type: 'json' };

/**
 * 由錄製的真實 Jolpica 回應建出 Snapshot。
 *
 * 這是測試唯一的資料入口 —— 測試不打真實網路（見 docs/spec/0001）。
 * 錄製時間點：2026 賽季第 13 站（義大利 GP）結束後。
 */
export const fixtureInput = (): NormaliseInput => ({
  races,
  driverStandings,
  teamStandings,
  openF1Drivers,
  results: [resultsPage1, resultsPage2, resultsPage3],
  sprints: [sprintPage1, sprintPage2],
  qualifying: [qualifyingPage1, qualifyingPage2, qualifyingPage3],
  fetchedAt: '2026-09-10T00:00:00.000Z',
});

export const buildFixtureSnapshot = (): Snapshot => normaliseSeason(fixtureInput());

/** OpenF1 錄製：義大利站 FP1（11354）與中國站衝刺排位（11236）的名次表。 */
export const fixtureOpenF1 = () => ({
  sessions: openF1Sessions,
  results: { 11354: openF1Fp1 as RawOpenF1SessionResult[], 11236: openF1Sq as RawOpenF1SessionResult[] },
  drivers: openF1MeetingDrivers,
});

export const fixtureTimedResults = (): TimedResults => normaliseTimedResults(fixtureInput(), fixtureOpenF1());

/** 核心快照 + sidecar 摘要（Session.leader 已填）。 */
export const buildFixtureSnapshotWithTimed = (): Snapshot =>
  normaliseSeason({ ...fixtureInput(), timedResults: fixtureTimedResults() });
