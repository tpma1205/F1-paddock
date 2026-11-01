/**
 * 積分走勢圖的線型：同隊同色，靠線型分人（identity 不靠顏色）。
 *
 * 同隊依積分榜順序：第 1 位實線、第 2 位虛線、第 3 位以後點線。第 3 位只在
 * 賽季中換過人時出現（代打車手、季中替換），通常積分最低，自然落在點線。
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted';

export const lineStyleFor = (teammateIndex: number): LineStyle =>
  teammateIndex <= 0 ? 'solid' : teammateIndex === 1 ? 'dashed' : 'dotted';

/**
 * SVG 的 stroke-dasharray。點線用近零長度的線段，靠 .chart__line 的圓形線帽
 * 畫成圓點。實線回傳 undefined，不輸出這個屬性。
 */
export const DASHARRAY: Record<LineStyle, string | undefined> = {
  solid: undefined,
  dashed: '7 5',
  dotted: '0.5 5',
};
