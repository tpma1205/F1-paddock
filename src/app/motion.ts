import { useMemo } from 'react';
import { useReducedMotion, type Variants } from 'motion/react';

export interface Entrance {
  container: Variants;
  item: Variants;
  reduced: boolean;
}

/**
 * 全站共用的進場動態。
 *
 * 三條規則：
 *
 * 1. **只用 transform 與 opacity** —— 這兩者由合成器處理，不觸發重排，
 *    滾動時才不會掉幀。
 * 2. **尊重 `prefers-reduced-motion`** —— 使用者開啟減少動畫時，位移一律
 *    歸零、只保留淡入，而不是整個停用（完全不動會讓元素突兀地出現）。
 * 3. **變體物件必須穩定** —— 倒數計時讓畫面每秒 re-render 一次；若每次都
 *    回傳新的變體物件，Motion 會重新解析並重播整段 stagger，元素會永遠
 *    卡在淡入的過程中。變體只跟著 reduced 改變，因此以 useMemo 固定住。
 */
export const useEntrance = (): Entrance => {
  const reduced = useReducedMotion() ?? false;

  return useMemo(
    () => ({
      reduced,
      container: {
        hidden: {},
        shown: {
          transition: {
            // 卡片依序錯開，像起跑燈依序亮起，而非整排同時出現。
            staggerChildren: reduced ? 0 : 0.06,
            delayChildren: reduced ? 0 : 0.08,
          },
        },
      },
      item: {
        hidden: { opacity: 0, y: reduced ? 0 : 18 },
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: reduced ? 0.2 : 0.55, ease: [0.16, 1, 0.3, 1] },
        },
      },
    }),
    [reduced],
  );
};
