import type { LonLat } from '../domain/trackGeometry.ts';

/**
 * Vendor 進 repo 的賽道外框（由 scripts/fetch-circuits.ts 產生）。
 *
 * 以 Jolpica 的 circuitId 為鍵。缺漏時回傳 null —— 賽曆新增賽道而外框
 * 尚未補上時，畫面只少一張圖，其餘資訊照常顯示。
 */
export interface CircuitOutline {
  name: string;
  coordinates: LonLat[];
  lengthMetres: number | null;
  altitudeMetres: number | null;
}

const modules = import.meta.glob('./circuits/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

const byCircuitId = new Map<string, CircuitOutline>();
for (const [path, value] of Object.entries(modules)) {
  const id = path.match(/\/([^/]+)\.json$/)?.[1];
  if (id) byCircuitId.set(id, value as CircuitOutline);
}

export const circuitOutlineFor = (circuitId: string): CircuitOutline | null =>
  byCircuitId.get(circuitId) ?? null;
