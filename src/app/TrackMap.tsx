import { useMemo, type JSX } from 'react';
import type { LonLat } from '../domain/trackGeometry.ts';
import { projectOutline } from '../domain/trackGeometry.ts';

interface TrackMapProps {
  coordinates: ReadonlyArray<LonLat>;
  /** 是否標示起跑線。縮圖太小看不清楚，不標。 */
  showStart?: boolean;
  /** 無障礙標題。 */
  title: string;
}

/**
 * 賽道平面圖 —— GeoJSON 外框自繪成 SVG（見 docs/adr/0003：唯一可合法
 * 納入 repo 的圖像素材）。靜態呈現：完整的賽道線，必要時加上紅色起跑點。
 */
export const TrackMap = ({ coordinates, showStart = false, title }: TrackMapProps): JSX.Element | null => {
  const track = useMemo(() => projectOutline(coordinates), [coordinates]);

  if (!track) return null;

  return (
    <div className="track-map">
      <svg viewBox={track.viewBox} role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
        <path className="track-map__line" d={track.d} />

        {showStart && (
          <g transform={`translate(${track.start.x} ${track.start.y})`}>
            <circle r={14} className="track-map__start-halo" />
            <circle r={7} className="track-map__start-dot" />
          </g>
        )}
      </svg>
    </div>
  );
};
