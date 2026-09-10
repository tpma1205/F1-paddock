/**
 * 抓取當前球季資料並寫出 Snapshot。
 *
 * 兩條規則（見 docs/adr/0001 與 docs/adr/0004）：
 *
 * 1. **一律使用 `/current/`，絕不寫死年份** —— 跨年時它自行指向新球季。
 * 2. **抓取失敗時沿用既有 Snapshot** —— Jolpica 由志工營運，暫時失效是可預期的，
 *    不該讓第三方服務的故障變成部署失敗。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normaliseSeason,
  type RawDriverStandingsResponse,
  type RawRacesResponse,
  type RawTeamStandingsResponse,
} from '../src/data/jolpica.ts';

const BASE = 'https://api.jolpi.ca/ergast/f1/current';
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'snapshot.json');

const getJson = async <T>(path: string): Promise<T> => {
  const url = `${BASE}${path}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return (await response.json()) as T;
};

const main = async (): Promise<void> => {
  try {
    // 循序而非平行 —— Jolpica 是免費且由志工維護的服務，抓取應保持節制。
    const races = await getJson<RawRacesResponse>('/races/?format=json&limit=30');
    const driverStandings = await getJson<RawDriverStandingsResponse>(
      '/driverstandings/?format=json&limit=30',
    );
    const teamStandings = await getJson<RawTeamStandingsResponse>(
      '/constructorstandings/?format=json&limit=30',
    );

    const snapshot = normaliseSeason({
      races,
      driverStandings,
      teamStandings,
      fetchedAt: new Date().toISOString(),
    });

    writeFileSync(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(
      `✓ ${snapshot.season} 球季：${snapshot.weekends.length} 站、已完成第 ${snapshot.completedRound ?? 0} 站`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (existsSync(OUTPUT)) {
      const existing = JSON.parse(readFileSync(OUTPUT, 'utf8')) as { fetchedAt?: string };
      console.warn(`⚠ 抓取失敗（${message}）`);
      console.warn(`  沿用既有快照（抓取於 ${existing.fetchedAt ?? '未知時間'}），建置繼續。`);
      return;
    }

    console.error(`✗ 抓取失敗且無既有快照可用：${message}`);
    process.exitCode = 1;
  }
};

await main();
