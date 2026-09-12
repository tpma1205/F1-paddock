/**
 * 設計系統的色票，供**程式碼**使用（例如 readableOn 的背景參數、Motion 的
 * 動態樣式）。CSS 這邊的真相在 styles.css 的 :root —— 兩邊必須一致，這裡的
 * 註解標出對應的 CSS 變數。
 */

/** `--ground`：頁面底色。 */
export const GROUND = '#07070a';
/** `--surface`：卡片底色。 */
export const SURFACE = '#101014';
/** `--raised`：浮起元素底色（logo 銘牌以外的替代圖、Next Session 列）。 */
export const RAISED = '#17171d';
/** `--text-dim`：沒有代表色時的中性備用色。 */
export const NEUTRAL_ACCENT = '#8b8b96';
