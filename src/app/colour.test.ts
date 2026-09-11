import { describe, expect, it } from 'vitest';
import { MIN_TEXT_CONTRAST, contrastRatio, readableOn } from './colour.ts';

const SURFACE = '#101014';

describe('contrastRatio', () => {
  it('黑白對比為 21', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });

  it('與順序無關', () => {
    expect(contrastRatio('#f47600', SURFACE)).toBeCloseTo(contrastRatio(SURFACE, '#f47600'), 5);
  });
});

describe('readableOn —— 代表色作為文字時的可讀性', () => {
  it('已經夠亮的顏色原樣回傳（McLaren 橘）', () => {
    expect(readableOn('#f47600', SURFACE)).toBe('#f47600');
  });

  it.each([
    ['Cadillac 灰', '#909090'],
    ['Haas 灰', '#9c9fa2'],
    ['Red Bull 藍', '#4781d7'],
    ['Williams 藍', '#1868db'],
    ['Aston Martin 綠', '#229971'],
  ])('%s 提亮到達 WCAG AA 門檻', (_label, hex) => {
    const result = readableOn(hex, SURFACE);
    expect(contrastRatio(result, SURFACE)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('提亮是與白色混合，保留原本的色相 —— 提亮後的 Red Bull 藍仍然是藍', () => {
    const result = readableOn('#4781d7', SURFACE);
    const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(result.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r as number);
    expect(b).toBeGreaterThan(g as number);
  });

  it('不會提亮超過需要的程度 —— 剛好達標即停', () => {
    const result = readableOn('#4781d7', SURFACE);
    expect(result).not.toBe('#ffffff');
  });

  it('淺色背景（logo 白色銘牌）時往黑調而非往白調', () => {
    const onWhite = readableOn('#909090', '#ffffff');
    expect(contrastRatio(onWhite, '#ffffff')).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    // 變暗了，而不是變亮
    const [r] = [1].map((i) => Number.parseInt(onWhite.slice(i, i + 2), 16));
    expect(r as number).toBeLessThan(0x90);
  });

  it('在白底上已可讀的深色原樣回傳（Williams 藍）', () => {
    expect(readableOn('#1868db', '#ffffff')).toBe('#1868db');
  });

  it('在白底上差一點達標的顏色只微調而非大幅變色（Audi 紅 4.0 → 4.5）', () => {
    const result = readableOn('#f50537', '#ffffff');
    expect(result).not.toBe('#f50537');
    expect(result).not.toBe('#000000');
    expect(contrastRatio(result, '#ffffff')).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('無法解析的顏色原樣回傳，不拋錯', () => {
    expect(readableOn('not-a-colour', SURFACE)).toBe('not-a-colour');
  });
});
