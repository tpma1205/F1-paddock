import { describe, expect, it } from 'vitest';
import { bundledSnapshot } from '../data/snapshot.ts';
import { teamLogoUrl, wordmarkText } from './teamAssets.ts';

describe('teamLogoUrl', () => {
  it('官方 CDN 有 logo 的車隊回傳熱連結網址', () => {
    expect(teamLogoUrl('mclaren')).toBe(
      'https://media.formula1.com/content/dam/fom-website/teams/2025/mclaren-logo.png',
    );
    expect(teamLogoUrl('red_bull')).toContain('red-bull-racing-logo.png');
  });

  it('Audi 與 Cadillac 官方 CDN 查無檔案，回傳 null 交由字標處理', () => {
    expect(teamLogoUrl('audi')).toBeNull();
    expect(teamLogoUrl('cadillac')).toBeNull();
  });

  it('本季除了 Audi 與 Cadillac 之外，每支車隊都有 logo', () => {
    const withoutLogo = bundledSnapshot.teamStandings
      .map((s) => s.team.id)
      .filter((id) => teamLogoUrl(id) === null)
      .sort();

    expect(withoutLogo).toEqual(['audi', 'cadillac']);
  });
});

describe('wordmarkText', () => {
  it('去掉 "F1 Team" 尾綴', () => {
    expect(wordmarkText('Cadillac F1 Team')).toBe('Cadillac');
    expect(wordmarkText('Haas F1 Team')).toBe('Haas');
  });

  it('沒有尾綴的名稱原樣回傳', () => {
    expect(wordmarkText('Audi')).toBe('Audi');
    expect(wordmarkText('Aston Martin')).toBe('Aston Martin');
  });
});
