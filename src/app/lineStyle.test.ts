import { describe, expect, it } from 'vitest';
import { DASHARRAY, lineStyleFor } from './lineStyle.ts';

describe('積分走勢圖線型', () => {
  it('同隊第 1 位實線、第 2 位虛線', () => {
    expect(lineStyleFor(0)).toBe('solid');
    expect(lineStyleFor(1)).toBe('dashed');
  });

  it('第 3 位以後（代打、季中換人）用點線，不會退回實線而與第 1 位撞樣', () => {
    expect(lineStyleFor(2)).toBe('dotted');
    expect(lineStyleFor(3)).toBe('dotted');
  });

  it('三種線型的 SVG 樣式互不相同', () => {
    const values = (['solid', 'dashed', 'dotted'] as const).map((s) => DASHARRAY[s]);
    expect(new Set(values).size).toBe(3);
  });
});
