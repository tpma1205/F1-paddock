/**
 * 賽道的手工資料 —— 與中英對照表同為人工維護的資產。
 *
 * 三類欄位，來源不同：
 *
 * - `geojsonId`：對應 bacinger/f1-circuits（MIT）的檔名，賽道外框由此而來。
 *   Jolpica 的 circuitId 與該 repo 的命名法（國碼-啟用年）無法自動對應。
 * - `turns`、`laps`：彎道數與正賽圈數，公開且穩定的事實。
 * - `lapRecord`：正賽單圈紀錄。**紀錄會被刷新，這欄需要人工跟進**；
 *   不確定或尚無紀錄（例如 2026 全新的 Madring）時為 null，畫面顯示「—」。
 *
 * 缺漏任何一筆時畫面降級：沒有 geojsonId 就沒有平面圖，其餘資訊照常顯示。
 */

export interface LapRecord {
  /** 例如 "1:18.750" */
  time: string;
  driver: string;
  year: number;
}

export interface CircuitInfo {
  geojsonId: string;
  turns: number;
  laps: number;
  lapRecord: LapRecord | null;
}

const info = (
  geojsonId: string,
  turns: number,
  laps: number,
  lapRecord: LapRecord | null = null,
): CircuitInfo => ({ geojsonId, turns, laps, lapRecord });

const record = (time: string, driver: string, year: number): LapRecord => ({ time, driver, year });

/** 以 Jolpica 的 circuitId 為鍵。 */
export const CIRCUIT_INFO: Record<string, CircuitInfo> = {
  albert_park: info('au-1953', 14, 58, record('1:19.813', 'Charles Leclerc', 2024)),
  shanghai: info('cn-2004', 16, 56, record('1:32.238', 'Michael Schumacher', 2004)),
  suzuka: info('jp-1962', 18, 53, record('1:30.983', 'Lewis Hamilton', 2019)),
  miami: info('us-2022', 19, 57, record('1:29.708', 'Max Verstappen', 2023)),
  villeneuve: info('ca-1978', 14, 70, record('1:13.078', 'Valtteri Bottas', 2019)),
  monaco: info('mc-1929', 19, 78, record('1:12.909', 'Lewis Hamilton', 2021)),
  catalunya: info('es-1991', 14, 66, record('1:16.330', 'Max Verstappen', 2023)),
  red_bull_ring: info('at-1969', 10, 71, record('1:05.619', 'Carlos Sainz', 2020)),
  silverstone: info('gb-1948', 18, 52, record('1:27.097', 'Max Verstappen', 2020)),
  spa: info('be-1925', 19, 44, record('1:44.701', 'Sergio Pérez', 2024)),
  hungaroring: info('hu-1986', 14, 70, record('1:16.627', 'Lewis Hamilton', 2020)),
  zandvoort: info('nl-1948', 14, 72, record('1:11.097', 'Lewis Hamilton', 2021)),
  monza: info('it-1922', 11, 53, record('1:21.046', 'Rubens Barrichello', 2004)),
  // 2026 全新啟用，尚無單圈紀錄。
  madring: info('es-2026', 22, 57),
  baku: info('az-2016', 20, 51, record('1:43.009', 'Charles Leclerc', 2019)),
  sepang: info('my-1999', 15, 56, record('1:34.080', 'Sebastian Vettel', 2017)),
  marina_bay: info('sg-2008', 19, 62, record('1:34.486', 'Daniel Ricciardo', 2024)),
  americas: info('us-2012', 20, 56, record('1:36.169', 'Charles Leclerc', 2019)),
  rodriguez: info('mx-1962', 17, 71, record('1:17.774', 'Valtteri Bottas', 2021)),
  interlagos: info('br-1977', 15, 71, record('1:10.540', 'Valtteri Bottas', 2018)),
  vegas: info('us-2023', 17, 50, record('1:34.876', 'Lando Norris', 2024)),
  losail: info('qa-2004', 16, 57, record('1:22.384', 'Lando Norris', 2024)),
  yas_marina: info('ae-2009', 16, 58, record('1:25.637', 'Kevin Magnussen', 2024)),
};

export const circuitInfoFor = (circuitId: string): CircuitInfo | null =>
  CIRCUIT_INFO[circuitId] ?? null;
