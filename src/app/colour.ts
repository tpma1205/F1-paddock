/**
 * 車隊代表色的可讀性處理。
 *
 * 代表色來自 OpenF1，不是為深色背景設計的：Cadillac 是 #909090 的灰、
 * Haas 是 #9c9fa2、Red Bull 是 #4781d7 的藍 —— 直接當文字放在黑底上會
 * 不好讀。規則（見 docs/spec/0001）：**作為文字時自動提亮到可讀，作為
 * 圖形裝飾（色條、光暈）時保留原色**，因為裝飾不需要通過對比度門檻。
 *
 * 對比度計算依 WCAG 2.x 的相對亮度公式。
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const parseHex = (hex: string): Rgb | null => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1], 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
};

const toHex = ({ r, g, b }: Rgb): string =>
  `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

const channel = (value: number): number => {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex: string): number => {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
};

/** WCAG 對比度，1（無對比）到 21（黑白）。 */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
};

/** 與目標色混合；amount 為 0（原色）到 1（純目標色）。 */
const mix = (rgb: Rgb, target: number, amount: number): Rgb => ({
  r: rgb.r + (target - rgb.r) * amount,
  g: rgb.g + (target - rgb.g) * amount,
  b: rgb.b + (target - rgb.b) * amount,
});

/** WCAG AA 對一般文字的門檻。 */
export const MIN_TEXT_CONTRAST = 4.5;

/**
 * 回傳在指定背景上可讀的版本：已可讀則原樣回傳，否則逐步往**遠離背景**的
 * 方向混合直到達標 —— 深色背景往白調、淺色背景（例如 logo 的白色銘牌）往黑調。
 * 混合而非直接換色，是為了盡量保留品牌色相：調整後的 Red Bull 藍仍然是藍。
 */
export const readableOn = (hex: string, background: string, minRatio = MIN_TEXT_CONTRAST): string => {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  if (contrastRatio(hex, background) >= minRatio) return hex;

  const backgroundIsLight = relativeLuminance(background) > 0.5;
  const target = backgroundIsLight ? 0 : 255;

  for (let amount = 0.1; amount <= 1; amount += 0.1) {
    const candidate = toHex(mix(rgb, target, amount));
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return backgroundIsLight ? '#000000' : '#ffffff';
};
