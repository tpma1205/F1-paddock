import { describe, expect, it } from 'vitest';
import { raceDistanceKm } from './circuitStats.ts';

describe('raceDistanceKm', () => {
  it('單圈 × 圈數，四捨五入到小數一位', () => {
    expect(raceDistanceKm(5278, 58)).toBe(306.1);
    expect(raceDistanceKm(3337, 78)).toBe(260.3);
  });
  it('缺長度或圈數為 null', () => {
    expect(raceDistanceKm(null, 58)).toBeNull();
    expect(raceDistanceKm(5278, null)).toBeNull();
  });
});
