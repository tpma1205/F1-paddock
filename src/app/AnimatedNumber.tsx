import { useEffect, useRef, useState, type JSX } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  /** 動畫時長（秒）。 */
  duration?: number;
}

/**
 * 進入視窗時從 0 跑到目標值的數字。
 *
 * - `prefers-reduced-motion` 開啟時直接顯示目標值，不跑動畫。
 * - 只跑一次：離開再進入視窗不重播，數字跳來跳去會讓人以為資料變了。
 * - 目標值改變時（例如快照背景更新）直接跳到新值，不從 0 重跑。
 */
export const AnimatedNumber = ({ value, duration = 1.2 }: AnimatedNumberProps): JSX.Element => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduced = useReducedMotion() ?? false;
  const [shown, setShown] = useState(reduced ? value : 0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    if (!inView) return;

    if (hasAnimated.current) {
      setShown(value);
      return;
    }
    hasAnimated.current = true;

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  return <span ref={ref}>{shown}</span>;
};
