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
  type RawResultsResponse,
  type RawTeamStandingsResponse,
} from '../src/data/jolpica.ts';
import type { RawOpenF1Driver } from '../src/data/openf1.ts';
import type { Snapshot } from '../src/domain/types.ts';

const BASE = 'https://api.jolpi.ca/ergast/f1/current';
const OPENF1_DRIVERS = 'https://api.openf1.org/v1/drivers?session_key=latest';

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

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return (await response.json()) as T;
};

/** 目前磁碟上最新的一份快照；沒有則為 null。 */
const loadExistingSnapshot = (): Snapshot | null => {
  if (!existsSync(OUTPUT_DIR)) return null;
  const newest = readdirSync(OUTPUT_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .at(-1);
  if (!newest) return null;
  return JSON.parse(readFileSync(join(OUTPUT_DIR, newest), 'utf8')) as Snapshot;
};

/**
 * 從上一份快照還原出「等價於 OpenF1 回應」的車手清單。
 *
 * OpenF1 在**直播期間會封鎖所有未認證請求，連歷史資料也擋**（實測 401：
 * "Live F1 session in progress. Global API access (including past sessions)
 * is restricted to authenticated users until the session ends."）。
 * 若此時抓取，顏色與照片會全部消失，而它們一週內幾乎不會變 —— 沿用上一份
 * 遠好過清空。合成的形狀與 OpenF1 原始回應一致，normalise 不需知道差別。
 */
const carryForwardOpenF1 = (previous: Snapshot): RawOpenF1Driver[] =>
  previous.driverStandings.flatMap((standing) => {
    const { driver } = standing;
    const team = standing.teams.at(-1);
    if (!driver.code) return [];
    return [
      {
        driver_number: Number(driver.permanentNumber ?? 0),
        name_acronym: driver.code,
        full_name: `${driver.givenName} ${driver.familyName}`,
        team_name: team?.name ?? '',
        team_colour: team?.colour ? team.colour.replace(/^#/, '') : null,
        headshot_url: driver.headshotUrl,
      },
    ];
  });

/**
 * OpenF1 只補充顏色與照片，**它失效不該阻止快照產出**。失敗時優先沿用
 * 上一份快照的顏色與照片；連上一份都沒有，才產出無顏色的快照由畫面降級。
 */
const getOpenF1Drivers = async (previous: Snapshot | null): Promise<RawOpenF1Driver[]> => {
  try {
    return await getJson<RawOpenF1Driver[]>(OPENF1_DRIVERS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (previous) {
      const carried = carryForwardOpenF1(previous);
      console.warn(`⚠ OpenF1 抓取失敗（${message}），沿用上一份快照的代表色與照片（${carried.length} 位車手）。`);
      return carried;
    }
    console.warn(`⚠ OpenF1 抓取失敗（${message}）且無上一份快照，本次快照將沒有代表色與車手照片。`);
    return [];
  }
};

const main = async (): Promise<void> => {
  try {
    // 循序而非平行 —— Jolpica 是免費且由志工維護的服務，抓取應保持節制。
    const races = await getJson<RawRacesResponse>(`${BASE}/races/?format=json&limit=30`);
    const driverStandings = await getJson<RawDriverStandingsResponse>(
      `${BASE}/driverstandings/?format=json&limit=30`,
    );
    const teamStandings = await getJson<RawTeamStandingsResponse>(
      `${BASE}/constructorstandings/?format=json&limit=30`,
    );
    const openF1Drivers = await getOpenF1Drivers(loadExistingSnapshot());

    // 整季賽果分頁抓取：Jolpica 把 limit 上限鎖在 100，一站 22 筆，
    // 13 站即 3 頁 —— 仍遠好過逐站 23 次。同一站可能跨頁，由 normalise 依 round 合併。
    const results: RawResultsResponse[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await getJson<RawResultsResponse>(
        `${BASE}/results/?format=json&limit=100&offset=${offset}`,
      );
      results.push(page);
      if (offset + 100 >= Number(page.MRData.total)) break;
    }

    const snapshot = normaliseSeason({
      races,
      driverStandings,
      teamStandings,
      openF1Drivers,
      results,
      fetchedAt: new Date().toISOString(),
    });

    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(pathForSeason(snapshot.season), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    const coloured = snapshot.teamStandings.filter((s) => s.team.colour !== null).length;
    const withResults = snapshot.weekends.filter((w) => w.results !== null).length;
    console.log(
      `✓ ${snapshot.season} 球季：${snapshot.weekends.length} 站、已完成第 ${snapshot.completedRound ?? 0} 站、${withResults} 站有賽果、${coloured}/${snapshot.teamStandings.length} 隊有代表色`,
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
