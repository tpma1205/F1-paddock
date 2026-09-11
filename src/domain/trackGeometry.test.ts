import { describe, expect, it } from 'vitest';
import { projectOutline, type LonLat } from './trackGeometry.ts';

/** 解析 path d 字串裡的所有座標對。 */
const pointsOf = (d: string): Array<[number, number]> =>
  [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

/** 內容本身的寬高比（不含留白）—— 「形狀有沒有被壓扁」要看這個，不是看含留白的外框。 */
const contentAspect = (d: string): number => {
  const points = pointsOf(d);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
};

/** 以四個角落描述一個矩形環（首尾相接）。 */
const ring = (lon0: number, lat0: number, lon1: number, lat1: number): LonLat[] => [
  [lon0, lat0],
  [lon1, lat0],
  [lon1, lat1],
  [lon0, lat1],
  [lon0, lat0],
];

describe('projectOutline', () => {
  it('少於三個點無法構成賽道，回傳 null', () => {
    expect(projectOutline([])).toBeNull();
    expect(projectOutline([[0, 0]])).toBeNull();
    expect(projectOutline([[0, 0], [1, 1]])).toBeNull();
  });

  it('赤道上的正方形投影後仍是正方形', () => {
    const track = projectOutline(ring(0, 0, 0.01, 0.01));
    expect(track).not.toBeNull();
    expect(contentAspect(track!.d)).toBeCloseTo(1, 2);
  });

  it('高緯度的賽道不得被壓扁 —— 經度要乘上緯度的餘弦', () => {
    // 在北緯 60 度，一度經度的實際距離只有赤道的一半（cos 60° = 0.5）。
    // 這個環在地面上是正方形：經度跨 0.02 度、緯度跨 0.01 度。
    const track = projectOutline(ring(0, 60, 0.02, 60.01));
    expect(track).not.toBeNull();
    expect(contentAspect(track!.d)).toBeCloseTo(1, 1);
  });

  it('沒有餘弦修正的話，同一個環會變成寬度兩倍的長方形（反向驗證）', () => {
    // 這條測試守住的是「修正真的有作用」：同樣的經緯跨度放到赤道上，就該是 2:1。
    const atEquator = projectOutline(ring(0, 0, 0.02, 0.01));
    expect(contentAspect(atEquator!.d)).toBeCloseTo(2, 1);
  });

  it('北方朝上 —— 緯度越高，y 越小', () => {
    const track = projectOutline([
      [0, 0],
      [0.01, 0],
      [0.005, 0.02],
      [0, 0],
    ]);
    const points = pointsOf(track!.d);
    const [, southY] = points[0]!;
    const [, northY] = points[2]!;
    expect(northY).toBeLessThan(southY);
  });

  it('所有座標落在留白之內，長邊撐滿指定尺寸', () => {
    const track = projectOutline(ring(0, 0, 0.02, 0.01), { size: 1000, padding: 40 });
    const points = pointsOf(track!.d);

    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(40 - 1e-6);
      expect(x).toBeLessThanOrEqual(track!.width - 40 + 1e-6);
      expect(y).toBeGreaterThanOrEqual(40 - 1e-6);
      expect(y).toBeLessThanOrEqual(track!.height - 40 + 1e-6);
    }
    // 寬邊 = 1000，內容區 = 920
    expect(track!.width).toBe(1000);
    expect(Math.max(...points.map(([x]) => x)) - Math.min(...points.map(([x]) => x))).toBeCloseTo(920, 5);
  });

  it('viewBox 與寬高一致', () => {
    const track = projectOutline(ring(0, 0, 0.02, 0.01));
    expect(track!.viewBox).toBe(`0 0 ${track!.width} ${track!.height}`);
  });

  it('首尾相接的環以 Z 閉合；起點即起跑線位置', () => {
    const track = projectOutline(ring(0, 0, 0.01, 0.01));
    expect(track!.d.trim().endsWith('Z')).toBe(true);
    const [firstX, firstY] = pointsOf(track!.d)[0]!;
    expect(track!.start).toEqual({ x: firstX, y: firstY });
  });

  it('首尾不相接的線不強行閉合', () => {
    const track = projectOutline([
      [0, 0],
      [0.01, 0],
      [0.01, 0.01],
    ]);
    expect(track!.d.trim().endsWith('Z')).toBe(false);
  });

  it('退化的輸入（所有點共線於一軸）不會除以零', () => {
    const track = projectOutline([
      [0, 0],
      [0.01, 0],
      [0.02, 0],
    ]);
    expect(track).not.toBeNull();
    expect(Number.isFinite(track!.height)).toBe(true);
    expect(track!.height).toBeGreaterThan(0);
  });
});
