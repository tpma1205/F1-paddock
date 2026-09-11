import { describe, expect, it } from 'vitest';
import { bundledSnapshot } from './snapshot.ts';
import { circuitOutlineFor } from './circuits.ts';
import { circuitInfoFor } from './circuitInfo.ts';
import { projectOutline } from '../domain/trackGeometry.ts';

const seasonCircuits = [...new Set(bundledSnapshot.weekends.map((w) => w.circuit.id))];

describe('賽道資料涵蓋率 —— 本季每條賽道都要有外框與手工資料', () => {
  it('每條賽道都有 vendor 進來的外框', () => {
    const missing = seasonCircuits.filter((id) => circuitOutlineFor(id) === null);
    expect(missing).toEqual([]);
  });

  it('每條賽道都有彎道數與圈數', () => {
    const missing = seasonCircuits.filter((id) => circuitInfoFor(id) === null);
    expect(missing).toEqual([]);
  });

  it('每條外框都能投影成有效的 SVG path', () => {
    for (const id of seasonCircuits) {
      const outline = circuitOutlineFor(id)!;
      const track = projectOutline(outline.coordinates);
      expect(track, id).not.toBeNull();
      expect(track!.d, id).toMatch(/^M /);
      expect(track!.width, id).toBeGreaterThan(0);
      expect(track!.height, id).toBeGreaterThan(0);
    }
  });

  it('F1 賽道都是閉合環 —— 每條 path 都以 Z 結尾', () => {
    const open = seasonCircuits.filter(
      (id) => !projectOutline(circuitOutlineFor(id)!.coordinates)!.d.endsWith('Z'),
    );
    expect(open).toEqual([]);
  });

  it('外框帶有長度與海拔', () => {
    const madring = circuitOutlineFor('madring');
    expect(madring?.lengthMetres).toBe(5474);
    expect(madring?.altitudeMetres).toBe(646);
  });

  it('查無資料時回傳 null 而非拋錯', () => {
    expect(circuitOutlineFor('atlantis')).toBeNull();
    expect(circuitInfoFor('atlantis')).toBeNull();
  });
});
