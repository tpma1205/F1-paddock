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
  normaliseTimedResults,
  type Debuts,
  type OpenF1SessionsInput,
  type RawDriverStandingsResponse,
  type RawQualifyingResponse,
  type RawRacesResponse,
  type RawResultsResponse,
  type RawSprintResponse,
  type RawTeamStandingsResponse,
} from '../src/data/jolpica.ts';
import {
  TIMED_KINDS,
  carryForwardTimedResults,
  matchOpenF1Session,
  type RawOpenF1Driver,
  type RawOpenF1Session,
  type RawOpenF1SessionResult,
} from '../src/data/openf1.ts';
import { endOf } from '../src/domain/season.ts';
import { timedKey, type Snapshot, type TimedResults } from '../src/domain/types.ts';

const API = 'https://api.jolpi.ca/ergast/f1';
const BASE = `${API}/current`;
const OPENF1 = 'https://api.openf1.org/v1';
const OPENF1_DRIVERS = `${OPENF1}/drivers?session_key=latest`;

/**
 * OpenF1 未認證的速率上限實測約每分鐘 30 次（400ms 間隔跑到第 20 次就 429）。
 * 每次請求間隔 2.1 秒；整季全抓約 120 次要 4 分多鐘，但只有第一次 —— 之後
 * 每週只補新場次（已有的沿用上一份快照）。
 */
const OPENF1_PAUSE_MS = 2100;
/** Jolpica 的節制：每秒約 3 次以內。 */
const JOLPICA_PAUSE_MS = 350;
const OPENF1_RETRY_AFTER_MS = 30_000;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 撞到 429 時等半分鐘再試一次；其他錯誤直接丟出。 */
const getOpenF1Json = async <T>(url: string): Promise<T> => {
  try {
    return await getJson<T>(url);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.endsWith('HTTP 429')) throw error;
    await sleep(OPENF1_RETRY_AFTER_MS);
    return getJson<T>(url);
  }
};

/**
 * 快照以 season 為索引鍵存放（`snapshots/<season>.json`，見 docs/adr/0004）。
 * 跨年時 `/current/` 指向新球季，本腳本便寫進一份新檔案，
 * 舊的一份原地留存即成封存 —— 不需要搬移或改寫任何資料。
 */
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'snapshots');
/** 練習賽／衝刺排位名次表的 sidecar，與核心快照同名、放在 timed/ 底下。 */
const TIMED_DIR = join(OUTPUT_DIR, 'timed');

/**
 * 縱深防禦：season 已在 normaliseSeason 驗證為四位數年份，這裡再確認解析後的
 * 路徑確實落在 OUTPUT_DIR 之內。
 *
 * 本腳本在 CI 中以 repo 寫入權限執行，寫入點是最後一道關卡 —— 就算日後有人
 * 放寬了上游的驗證，也不該讓第三方回應決定寫到哪裡。
 */
const pathForSeason = (season: string, dir = OUTPUT_DIR): string => {
  const target = resolve(join(dir, `${season}.json`));
  if (!target.startsWith(resolve(dir) + sep)) {
    throw new Error(`快照路徑越界：${JSON.stringify(season)}`);
  }
  return target;
};

const getJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return (await response.json()) as T;
};

/** 依 Jolpica 的 limit=100 分頁規則抓完整季。 */
const getAllPages = async <T extends { MRData: { total: string } }>(
  resource: string,
): Promise<T[]> => {
  const pages: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await getJson<T>(`${BASE}/${resource}/?format=json&limit=100&offset=${offset}`);
    pages.push(page);
    if (offset + 100 >= Number(page.MRData.total)) break;
  }
  return pages;
};

/**
 * 探測下一季的賽程。
 *
 * 本季最後一場結束後、Jolpica 的 `/current/` 跳到新年之前，有一段空窗；而
 * 下一季賽程通常在年中就公布了。若已公布，寫一份「只有賽程」的快照 ——
 * 讓 Off-season 的首頁能倒數到下一季開幕（docs/adr/0004）。年份由本季
 * 推算，不寫死。尚未公布（total 為 0）或抓取失敗都靜默略過。
 */
const fetchUpcomingSeason = async (currentSeason: string): Promise<void> => {
  const next = String(Number(currentSeason) + 1);
  try {
    const races = await getJson<RawRacesResponse>(`${API}/${next}/races/?format=json&limit=30`);
    if (races.MRData.RaceTable.Races.length === 0) return;

    const empty = { MRData: { StandingsTable: { season: next, round: '0', StandingsLists: [] } } };
    const snapshot = normaliseSeason({
      races,
      driverStandings: empty,
      teamStandings: empty,
      fetchedAt: new Date().toISOString(),
    });
    writeFileSync(pathForSeason(snapshot.season), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(`✓ ${next} 球季賽程已公布：${snapshot.weekends.length} 站（僅賽程，供 Off-season 倒數）`);
  } catch {
    // 下一季不存在或暫時抓不到都不是錯誤 —— 本季快照已寫好。
  }
};

/** 目前磁碟上最新的一份快照；沒有則為 null。 */
const loadExistingSnapshot = (): Snapshot | null => {
  if (!existsSync(OUTPUT_DIR)) return null;
  const newest = readdirSync(OUTPUT_DIR)
    .filter((name) => /^\d{4}\.json$/.test(name))
    .sort()
    .at(-1);
  if (!newest) return null;
  return JSON.parse(readFileSync(join(OUTPUT_DIR, newest), 'utf8')) as Snapshot;
};

const loadExistingTimedResults = (season: string): TimedResults | null => {
  const path = pathForSeason(season, TIMED_DIR);
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as TimedResults) : null;
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

/**
 * 由 OpenF1 抓沒有 Jolpica 來源的場次 Result（FP1–FP3、衝刺排位）。
 *
 * 只抓**已結束且上一份 sidecar 裡還沒有**的場次 —— 名次表定案後不會變，每週
 * 重抓全季是浪費；上一份有的直接沿用（carryForwardTimedResults）。任何一步
 * 失敗都只是少了那些場次，不影響快照產出。
 */
const getOpenF1Sessions = async (
  season: string,
  weekends: Snapshot['weekends'],
  previous: TimedResults | null,
): Promise<OpenF1SessionsInput | undefined> => {
  const nowMs = Date.now();
  let sessions: RawOpenF1Session[];
  try {
    sessions = await getOpenF1Json<RawOpenF1Session[]>(`${OPENF1}/sessions?year=${season}`);
  } catch (error) {
    console.warn(`⚠ OpenF1 場次清單抓取失敗（${error instanceof Error ? error.message : String(error)}），練習賽結果沿用上一份。`);
    return undefined;
  }

  const results: Record<number, RawOpenF1SessionResult[]> = {};
  const drivers: Array<Pick<RawOpenF1Driver, 'driver_number' | 'name_acronym'>> = [];
  const meetingsFetched = new Set<number>();
  let fetched = 0;

  for (const weekend of weekends) {
    for (const session of weekend.sessions) {
      if (!TIMED_KINDS.has(session.kind) || endOf(session) > nowMs) continue;
      if (previous?.[timedKey(weekend.round, session.kind)]) continue; // 上一份已有，沿用

      const key = matchOpenF1Session(session, sessions);
      if (key === null) continue;
      const meeting = sessions.find((s) => s.session_key === key)?.meeting_key;

      try {
        if (meeting !== undefined && !meetingsFetched.has(meeting)) {
          // 每個 meeting 抓一次車手清單：FP1 的青年車手只在這裡有車號 ↔ 縮寫
          drivers.push(...(await getOpenF1Json<RawOpenF1Driver[]>(`${OPENF1}/drivers?meeting_key=${meeting}`)));
          meetingsFetched.add(meeting);
          await sleep(OPENF1_PAUSE_MS);
        }
        const rows = await getOpenF1Json<RawOpenF1SessionResult[]>(`${OPENF1}/session_result?session_key=${key}`);
        if (rows.length > 0) results[key] = rows;
        fetched += 1;
        await sleep(OPENF1_PAUSE_MS);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // 404 = OpenF1 尚無該場次資料，不是故障；其他錯誤（401 直播封鎖）也只記一筆
        console.warn(`⚠ OpenF1 第 ${weekend.round} 站 ${session.kind} 結果抓取失敗（${message}）`);
      }
    }
  }

  console.log(`  OpenF1：新抓 ${fetched} 個場次的結果`);
  return { sessions, results, drivers };
};

/**
 * 各車手的出道球季：Jolpica「第一筆正賽賽果」的 season（`results?limit=1`
 * 預設由舊到新）。**不用 `/drivers/{id}/seasons`** —— 它把只跑 FP1 的年份也算
 * 進去，Antonelli 會變成 2024 而非 2025。
 *
 * 出道年不會變，上一份快照有的直接沿用；只對新面孔發請求。失敗的車手為
 * null，畫面隱藏該列。
 */
const getDebuts = async (
  standings: RawDriverStandingsResponse,
  previous: Snapshot | null,
): Promise<Debuts> => {
  const known = new Map(
    (previous?.driverStandings ?? []).flatMap((s) =>
      s.driver.debutSeason ? [[s.driver.id, s.driver.debutSeason] as const] : [],
    ),
  );
  const debuts: Record<string, string | null> = {};
  let fetched = 0;
  for (const { Driver } of standings.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? []) {
    const cached = known.get(Driver.driverId);
    if (cached) {
      debuts[Driver.driverId] = cached;
      continue;
    }
    try {
      const page = await getJson<RawResultsResponse>(`${API}/drivers/${Driver.driverId}/results.json?limit=1`);
      debuts[Driver.driverId] = page.MRData.RaceTable.Races[0]?.season ?? null;
      fetched += 1;
      await sleep(JOLPICA_PAUSE_MS);
    } catch (error) {
      console.warn(`⚠ ${Driver.driverId} 的出道年抓取失敗（${error instanceof Error ? error.message : String(error)}）`);
      debuts[Driver.driverId] = null;
    }
  }
  if (fetched > 0) console.log(`  Jolpica：新抓 ${fetched} 位車手的出道年`);
  return debuts;
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
    const previous = loadExistingSnapshot();
    const openF1Drivers = await getOpenF1Drivers(previous);
    const debuts = await getDebuts(driverStandings, previous);

    // 整季賽果／衝刺賽／排位賽分頁抓取：Jolpica 把 limit 上限鎖在 100，一站
    // 22 筆，13 站約 3 頁 —— 仍遠好過逐站抓。同一站可能跨頁，由 normalise 依
    // round 合併。積分走勢由正賽 + 衝刺賽積分推導（實測與積分榜 23/23 吻合），
    // 不需再抓逐站積分榜。
    const results = await getAllPages<RawResultsResponse>('results');
    const sprints = await getAllPages<RawSprintResponse>('sprint');
    const qualifying = await getAllPages<RawQualifyingResponse>('qualifying');

    const fetchedAt = new Date().toISOString();
    const jolpicaInput = { races, driverStandings, teamStandings, openF1Drivers, results, sprints, qualifying, debuts, fetchedAt };

    // 先用 Jolpica 建出賽程，才知道要向 OpenF1 要哪些場次；再帶著 sidecar 的摘要建一次
    const provisional = normaliseSeason(jolpicaInput);
    const previousTimed = loadExistingTimedResults(provisional.season);
    const openF1Sessions = await getOpenF1Sessions(provisional.season, provisional.weekends, previousTimed);
    const timedResults = carryForwardTimedResults(
      openF1Sessions ? normaliseTimedResults(jolpicaInput, openF1Sessions) : {},
      previousTimed,
    );
    const snapshot = normaliseSeason({ ...jolpicaInput, timedResults });

    mkdirSync(TIMED_DIR, { recursive: true });
    writeFileSync(pathForSeason(snapshot.season), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    writeFileSync(pathForSeason(snapshot.season, TIMED_DIR), `${JSON.stringify(timedResults)}\n`, 'utf8');
    await fetchUpcomingSeason(snapshot.season);
    const coloured = snapshot.teamStandings.filter((s) => s.team.colour !== null).length;
    const withResults = snapshot.weekends.filter((w) => w.results !== null).length;
    const timedSessions = Object.keys(timedResults).length;
    console.log(
      `✓ ${snapshot.season} 球季：${snapshot.weekends.length} 站、已完成第 ${snapshot.completedRound ?? 0} 站、${withResults} 站有賽果、${timedSessions} 個練習賽／衝刺排位有結果、${coloured}/${snapshot.teamStandings.length} 隊有代表色`,
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
