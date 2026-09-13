import { useMemo } from 'react';
import { useReducedMotion, type Variants } from 'motion/react';

export interface Entrance {
  container: Variants;
  item: Variants;
}

/**
 * 全站唯一的進場動態：**首頁倒數板載入時的一次揭示**。
 *
 * 其餘頁面與區塊不做進場動畫 —— 每個區塊各自淡入上滑是任何儀表板模板的
 * 預設，不是這個網站的選擇；內容直接在位，滾動時只有賽道會跟著描繪。
 * 因此 useEntrance 只在 `reveal: true` 時回傳真的位移，否則是「已在位」
 * 的變體，讓既有的 motion 元件不必逐一拆除也不會動。
 *
 * 規則不變：只用 transform 與 opacity；尊重 prefers-reduced-motion；變體物件
 * 以 useMemo 固定，倒數每秒 re-render 時 Motion 不會重新解析。
 */
export const useEntrance = (options: { reveal?: boolean } = {}): Entrance => {
  const reduced = useReducedMotion() ?? false;
  const reveal = options.reveal === true && !reduced;

  return useMemo(
    () => ({
      container: {
        hidden: {},
        shown: {
          // 倒數板的列依序亮起，像起跑燈
          transition: { staggerChildren: reveal ? 0.07 : 0, delayChildren: reveal ? 0.1 : 0 },
        },
      },
      item: {
        hidden: { opacity: reveal ? 0 : 1, y: reveal ? 14 : 0 },
        shown: { opacity: 1, y: 0, transition: { duration: reveal ? 0.5 : 0, ease: [0.16, 1, 0.3, 1] } },
      },
    }),
    [reveal],
  );
};
