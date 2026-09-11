import { useMemo, useRef, type JSX } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import type { LonLat } from '../domain/trackGeometry.ts';
import { projectOutline } from '../domain/trackGeometry.ts';

interface TrackMapProps {
  coordinates: ReadonlyArray<LonLat>;
  /** `static`：靜態縮圖。`scroll`：隨滾動描繪，並標示起跑線。 */
  mode?: 'static' | 'scroll';
  /** 無障礙標題。 */
  title: string;
}

/**
 * 賽道平面圖 —— GeoJSON 外框自繪成 SVG（見 docs/adr/0003：唯一可合法
 * 納入 repo 的圖像素材）。
 *
 * 描繪動畫的做法：`pathLength="1"` 把 dash 的度量正規化到 0–1，因此
 * stroke-dashoffset 從 1 走到 0 就是「從起跑線畫到終點」，不需要
 * getTotalLength() 也不依賴實際像素長度。滾動進度由 Motion 的 useScroll
 * 提供；`prefers-reduced-motion` 開啟時直接顯示完整線條。
 */
export const TrackMap = ({ coordinates, mode = 'static', title }: TrackMapProps): JSX.Element | null => {
  const track = useMemo(() => projectOutline(coordinates), [coordinates]);
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  // 元素頂端進入視窗下方 85% 時開始畫，底端到達視窗 45% 時畫完。
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] });
  const dashOffset = useTransform(scrollYProgress, [0, 1], [1, 0]);

  if (!track) return null;

  const animated = mode === 'scroll' && !reduced;

  return (
    <div className={`track-map track-map--${mode}`} ref={ref}>
      <svg viewBox={track.viewBox} role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
        {/* 底層的淡色全線 —— 描繪前就看得到賽道形狀，描繪過程有參照 */}
        <path className="track-map__ghost" d={track.d} pathLength={1} />

        {animated ? (
          <motion.path
            className="track-map__line"
            d={track.d}
            pathLength={1}
            strokeDasharray="1"
            style={{ strokeDashoffset: dashOffset }}
          />
        ) : (
          <path className="track-map__line" d={track.d} pathLength={1} />
        )}

        {mode === 'scroll' && (
          <g className="track-map__start" transform={`translate(${track.start.x} ${track.start.y})`}>
            <circle r={14} className="track-map__start-halo" />
            <circle r={7} className="track-map__start-dot" />
          </g>
        )}
      </svg>
    </div>
  );
};
