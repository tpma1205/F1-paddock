/**
 * 賽道外框：經緯度 → SVG path。純函式，無 DOM 依賴。
 *
 * 投影用「等距圓柱 + 緯度餘弦修正」：在幾公里的賽道尺度上，這與 Mercator
 * 的差異小於一個像素，但實作簡單得多。**餘弦修正不可省略** —— 一度經度
 * 的實際距離隨緯度縮短（北緯 60 度只剩一半），不修正的話高緯度賽道會被
 * 橫向拉寬、赤道附近的則相對被壓扁。
 */

/** [經度, 緯度]，與 GeoJSON 一致。 */
export type LonLat = [number, number];

export interface TrackPath {
  /** SVG path 的 d 屬性。 */
  d: string;
  viewBox: string;
  width: number;
  height: number;
  /** 起跑線位置（viewBox 座標）—— 賽道線從此處開始描繪。 */
  start: { x: number; y: number };
}

export interface ProjectOptions {
  /** 長邊的目標尺寸（viewBox 單位）。 */
  size?: number;
  /** 四周留白（viewBox 單位）。 */
  padding?: number;
}

const DEG_TO_RAD = Math.PI / 180;

/** 首尾距離小於外框對角線的這個比例，視為閉合環。 */
const CLOSE_TOLERANCE = 0.02;

const round = (value: number): number => Math.round(value * 100) / 100;

export const projectOutline = (
  coordinates: ReadonlyArray<LonLat>,
  { size = 1000, padding = 40 }: ProjectOptions = {},
): TrackPath | null => {
  if (coordinates.length < 3) return null;

  // 以平均緯度的餘弦縮放經度。
  const meanLat = coordinates.reduce((sum, [, lat]) => sum + lat, 0) / coordinates.length;
  const lonScale = Math.cos(meanLat * DEG_TO_RAD);

  // 投影：x 向東、y 向北（稍後翻轉成螢幕座標）。
  const projected = coordinates.map(([lon, lat]) => ({ x: lon * lonScale, y: lat }));

  const minX = Math.min(...projected.map((p) => p.x));
  const maxX = Math.max(...projected.map((p) => p.x));
  const minY = Math.min(...projected.map((p) => p.y));
  const maxY = Math.max(...projected.map((p) => p.y));

  // 退化輸入（例如所有點共線）給一個極小的跨度，避免除以零。
  const spanX = Math.max(maxX - minX, Number.EPSILON);
  const spanY = Math.max(maxY - minY, Number.EPSILON);

  const inner = size - padding * 2;
  const scale = inner / Math.max(spanX, spanY);

  const contentWidth = spanX * scale;
  const contentHeight = spanY * scale;
  const width = round(contentWidth + padding * 2);
  const height = round(contentHeight + padding * 2);

  const toScreen = (p: { x: number; y: number }) => ({
    x: round(padding + (p.x - minX) * scale),
    // 翻轉 y：緯度越高越靠近畫面上方。
    y: round(padding + (maxY - p.y) * scale),
  });

  const screen = projected.map(toScreen);
  const first = screen[0]!;
  const last = screen[screen.length - 1]!;

  const diagonal = Math.hypot(contentWidth, contentHeight);
  const closed = Math.hypot(first.x - last.x, first.y - last.y) <= diagonal * CLOSE_TOLERANCE;

  const commands = screen.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`);
  const d = closed ? `${commands.join(' ')} Z` : commands.join(' ');

  return {
    d,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    start: { x: first.x, y: first.y },
  };
};
