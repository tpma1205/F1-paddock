/**
 * 下載賽道外框 GeoJSON 並 vendor 進 repo。
 *
 * 來源是 bacinger/f1-circuits（MIT）—— 依 docs/adr/0003，這是唯一可以合法
 * 放進 repo 的圖像素材。賽道不會每週變，所以本腳本**不在**週排程裡，
 * 賽曆變動時手動執行一次即可。
 *
 * 每個檔案只保留 LineString 座標與少數屬性，丟掉其餘欄位以控制體積。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CIRCUIT_INFO } from '../src/data/circuitInfo.ts';

const SOURCE = 'https://raw.githubusercontent.com/bacinger/f1-circuits/master/circuits';
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'circuits');

interface RawFeatureCollection {
  features: Array<{
    properties: { Name?: string; Location?: string; length?: number; altitude?: number };
    geometry: { type: string; coordinates: unknown };
  }>;
}

/** 我們保留的形狀 —— 見 src/data/circuits.ts 的 CircuitOutline。 */
interface StoredOutline {
  name: string;
  /** [經度, 緯度] 依賽道行進順序。 */
  coordinates: [number, number][];
  lengthMetres: number | null;
  altitudeMetres: number | null;
}

const isCoordinateList = (value: unknown): value is [number, number][] =>
  Array.isArray(value) &&
  value.every(
    (point) =>
      Array.isArray(point) &&
      point.length >= 2 &&
      typeof point[0] === 'number' &&
      typeof point[1] === 'number',
  );

const main = async (): Promise<void> => {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  let failures = 0;

  for (const [circuitId, { geojsonId }] of Object.entries(CIRCUIT_INFO)) {
    const url = `${SOURCE}/${geojsonId}.geojson`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const collection = (await response.json()) as RawFeatureCollection;
      const feature = collection.features[0];
      if (!feature || feature.geometry.type !== 'LineString') {
        throw new Error('第一個 feature 不是 LineString');
      }
      if (!isCoordinateList(feature.geometry.coordinates)) {
        throw new Error('座標格式不符');
      }

      const outline: StoredOutline = {
        name: feature.properties.Name ?? circuitId,
        coordinates: feature.geometry.coordinates.map(([lon, lat]) => [lon, lat]),
        lengthMetres: feature.properties.length ?? null,
        altitudeMetres: feature.properties.altitude ?? null,
      };

      writeFileSync(join(OUTPUT_DIR, `${circuitId}.json`), `${JSON.stringify(outline)}\n`, 'utf8');
      console.log(`✓ ${circuitId.padEnd(14)} ${outline.name} (${outline.coordinates.length} 點)`);
    } catch (error) {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`✗ ${circuitId.padEnd(14)} ${url} —— ${message}`);
    }
  }

  if (failures > 0) {
    console.warn(`⚠ ${failures} 條賽道下載失敗；既有檔案（若有）保留不動。`);
  }
};

await main();
