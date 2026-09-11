import { describe, expect, it } from 'vitest';
import { bundledSnapshot } from '../data/snapshot.ts';
import { flagUrl, isoCodeFor } from './countries.ts';

describe('國家對照', () => {
  it('把 API 的口語國名對應到 ISO 代碼', () => {
    expect(isoCodeFor('UK')).toBe('gb');
    expect(isoCodeFor('USA')).toBe('us');
    expect(isoCodeFor('UAE')).toBe('ae');
    expect(isoCodeFor('Spain')).toBe('es');
  });

  it('未涵蓋的國家回傳 null 而非拋錯 —— 賽曆每年會變', () => {
    expect(isoCodeFor('Atlantis')).toBeNull();
    expect(flagUrl('Atlantis')).toBeNull();
  });

  it('產生點陣圖網址，而非會在 Windows 上變成兩個字母的 emoji', () => {
    expect(flagUrl('Spain')).toBe('https://flagcdn.com/w80/es.png');
    expect(flagUrl('Japan', 40)).toBe('https://flagcdn.com/w40/jp.png');
  });

  it('涵蓋當前球季賽曆上的每一個國家', () => {
    const missing = bundledSnapshot.weekends
      .map((weekend) => weekend.circuit.country)
      .filter((country) => isoCodeFor(country) === null);

    expect(missing).toEqual([]);
  });
});
