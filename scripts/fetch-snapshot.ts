/**
 * 抓取當前球季資料並寫出 Snapshot。
 *
 * 兩條規則（見 docs/adr/0001 與 docs/adr/0004）：
 *
 * 1. **一律使用 `/current/`，絕不寫死年份** —— 跨年時它自行指向新球季。
 * 2. **抓取失敗時沿用既有 Snapshot** —— Jolpica 由志工營運，暫時失效是可預期的，
 *    不該讓第三方服務的故障變成部署失敗。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normaliseSeason,
  type RawDriverStandingsResponse,
  type RawRacesResponse,
  type RawTeamStandingsResponse,
} from '../src/data/jolpica.ts';

const BASE = 'https://api.jolpi.ca/ergast/f1/current';

/**
 * 快照以 season 為索引鍵存放（`snapshots/<season>.json`，見 docs/adr/0004）。
 * 跨年時 `/current/` 指向新球季，本腳本便寫進一份新檔案，
 * 舊的一份原地留存即成封存 —— 不需要搬移或改寫任何資料。
 */
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'snapshots');

/**
 * 縱深防禦：season 已在 normaliseSeason 驗證為四位數年份，這裡再確認解析後的
 * 路徑確實落在 OUTPUT_DIR 之內。
 *
 * 本腳本在 CI 中以 repo 寫入權限執行，寫入點是最後一道關卡 —— 就算日後有人
 * 放寬了上游的驗證，也不該讓第三方回應決定寫到哪裡。
 */
const pathForSeason = (season: string): string => {
  const target = resolve(join(OUTPUT_DIR, `${season}.json`));
  if (!target.startsWith(resolve(OUTPUT_DIR) + sep)) {
    throw new Error(`快照路徑越界：${JSON.stringify(season)}`);
  }
  return target;
};

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

    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(pathForSeason(snapshot.season), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(
      `✓ ${snapshot.season} 球季：${snapshot.weekends.length} 站、已完成第 ${snapshot.completedRound ?? 0} 站`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const existing = existsSync(OUTPUT_DIR)
      ? readdirSync(OUTPUT_DIR)
          .filter((name) => name.endsWith('.json'))
          .sort()
      : [];
    const newest = existing.at(-1);

    if (newest) {
      const { fetchedAt } = JSON.parse(readFileSync(join(OUTPUT_DIR, newest), 'utf8')) as {
        fetchedAt?: string;
      };
      console.warn(`⚠ 抓取失敗（${message}）`);
      console.warn(`  沿用既有快照 ${newest}（抓取於 ${fetchedAt ?? '未知時間'}），建置繼續。`);
      return;
    }

    console.error(`✗ 抓取失敗且無既有快照可用：${message}`);
    process.exitCode = 1;
  }
};

await main();
