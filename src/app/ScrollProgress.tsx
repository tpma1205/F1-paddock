import { useEffect, useState, type JSX } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { useLocation } from 'react-router';

const DEFAULT_ACCENT = 'var(--f1-red)';

/**
 * 頂部的滾動進度條。
 *
 * 顏色跟著「目前最靠近視窗中線的區塊」走：帶 `data-accent` 的區塊會把
 * 自己的顏色投給進度條（例如戰況區用積分領先車隊的代表色），沒有的
 * 就回到網站骨幹紅。這是「顏色承載意義」原則的一個小例子 —— 你滾到哪，
 * 進度條就是誰的顏色。
 *
 * 動畫只動 transform（scaleX）與 background-color，不觸發重排。
 */
export const ScrollProgress = (): JSX.Element => {
  const reduced = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 32, restDelta: 0.001 });
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const { pathname } = useLocation();

  useEffect(() => {
    // 換頁後區塊會重新掛載，重新觀察。
    setAccent(DEFAULT_ACCENT);
    document.documentElement.style.setProperty('--section-accent', DEFAULT_ACCENT);
    const sections = document.querySelectorAll<HTMLElement>('[data-accent]');
    if (sections.length === 0) return;

    const visibility = new Map<Element, number>();
    const pick = () => {
      let best: HTMLElement | null = null;
      let bestRatio = 0;
      for (const [element, ratio] of visibility) {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = element as HTMLElement;
        }
      }
      const next = best?.dataset['accent'] || DEFAULT_ACCENT;
      setAccent(next);
      // 頁面底色的淡色層也跟著走（見 styles.css 的 .page::after）。
      document.documentElement.style.setProperty('--section-accent', next);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visibility.set(entry.target, entry.intersectionRatio);
        pick();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <motion.div
      className="scroll-progress"
      aria-hidden="true"
      style={{
        scaleX: reduced ? scrollYProgress : scaleX,
        backgroundColor: accent,
      }}
    />
  );
};
