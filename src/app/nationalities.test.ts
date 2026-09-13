import { describe, expect, it } from 'vitest';
import { bundledSnapshot } from '../data/snapshot.ts';
import { isoCodeFor } from './countries.ts';
import { localisedNationality, nationalityCountries } from './nationalities.ts';

describe('國籍對照表', () => {
  it('涵蓋本季全部車手的國籍 —— 缺一個就失敗', () => {
    const missing = bundledSnapshot.driverStandings
      .map((s) => s.driver.nationality)
      .filter((n) => localisedNationality(n) === null);
    expect(missing).toEqual([]);
  });

  it('每個對照到的國名都有國旗', () => {
    const noFlag = nationalityCountries().filter((c) => isoCodeFor(c) === null);
    expect(noFlag).toEqual([]);
  });

  it('demonym → 中文 + 國名', () => {
    expect(localisedNationality('Italian')).toEqual({ zh: '義大利', country: 'Italy' });
    expect(localisedNationality('British')?.country).toBe('UK');
    expect(localisedNationality('Martian')).toBeNull();
  });
});
