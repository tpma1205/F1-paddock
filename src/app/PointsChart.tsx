import { useId, useMemo, useState, type JSX } from 'react';
import type { PointsProgression, ProgressionSeries } from '../domain/types.ts';
import { localisedDriver } from '../data/localisation.ts';

/** 高亮的線數 —— 超過這個數字，顏色就分不開了（品牌色彼此太近，見票 10 的驗證器結果）。 */
const HIGHLIGHT_COUNT = 6;
/** 末端直接標示的線數；指引：≤ 4 條才直接標示，其餘交給 legend 與 tooltip。 */
const END_LABEL_COUNT = 4;
const TOOLTIP_ROWS = 8;

const WIDTH = 800;
const HEIGHT = 360;
const PAD = { top: 20, right: 64, bottom: 36, left: 44 };
const DASH = '7 5';

interface PointsChartProps {
  progression: PointsProgression;
}

/** Y 軸最大值取到整數十位，讓格線落在乾淨的數字上。 */
const niceMax = (value: number): number => Math.max(50, Math.ceil(value / 50) * 50);

const codeOf = (series: ProgressionSeries): string =>
  series.driver.code ?? series.driver.familyName.slice(0, 3).toUpperCase();

const nameOf = (series: ProgressionSeries): string =>
  localisedDriver(series.driver.id)?.zh ?? series.driver.familyName;

/**
 * 積分走勢圖：每位車手隨 Round 累積的積分。
 *
 * 編碼規則（見 dataviz 指引）：
 * - 顏色跟著實體（車隊代表色），**同隊兩人顏色相同，以實線／虛線區分**——
 *   這是 F1 轉播的慣例，也是驗證器要求的次要編碼。
 * - 只高亮前六名；品牌色不是設計過的分類色盤，超過六條就分不開。其餘淡化。
 * - 文字一律用文字色，不用系列色；identity 由旁邊的線段色鍵承擔。
 * - 只動 SVG 屬性與 opacity，無版面重排。
 */
export const PointsChart = ({ progression }: PointsChartProps): JSX.Element => {
  const { rounds, series } = progression;
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();

  const geometry = useMemo(() => {
    const n = rounds.length;
    const maxPoints = Math.max(0, ...series.map((s) => s.cumulative.at(-1) ?? 0));
    const yMax = niceMax(maxPoints);
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    // 單一 Round 時 n - 1 = 0，把唯一的點放在中間，避免除以零。
    const x = (i: number) => (n <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;
    const yTicks = Array.from({ length: yMax / 50 + 1 }, (_, i) => i * 50);
    return { n, yMax, x, y, yTicks };
  }, [rounds.length, series]);

  if (rounds.length === 0) {
    return <p className="chart__empty">賽季尚未開始，還沒有積分可以畫。</p>;
  }

  const { n, x, y, yTicks } = geometry;
  const highlighted = series.slice(0, HIGHLIGHT_COUNT);
  const muted = series.slice(HIGHLIGHT_COUNT);

  // 末端標示：由上到下排，相鄰太近就往下推，並記下是否被推過（要畫引線）。
  const endLabels = (() => {
    const MIN_GAP = 14;
    const placed = highlighted
      .slice(0, END_LABEL_COUNT)
      .map((s) => ({ series: s, anchorY: y(s.cumulative.at(-1) ?? 0), labelY: 0, nudged: false }))
      .sort((a, b) => a.anchorY - b.anchorY);
    let cursor = -Infinity;
    for (const label of placed) {
      label.labelY = Math.max(label.anchorY, cursor + MIN_GAP);
      label.nudged = Math.abs(label.labelY - label.anchorY) > 1;
      cursor = label.labelY;
    }
    return placed;
  })();

  const pathOf = (s: ProgressionSeries): string =>
    s.cumulative.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  const hoverIndex = hover ?? n - 1;
  const tooltipRows = [...series]
    .map((s) => ({ series: s, value: s.cumulative[hoverIndex] ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, TOOLTIP_ROWS);

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * WIDTH;
    // 十字線吸附到最近的 Round —— 讀者瞄準的是站次，不是 2px 的線。
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < n; i += 1) {
      const d = Math.abs(x(i) - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    setHover(nearest);
  };

  return (
    <figure className="chart">
      <div className="chart__scroll">
        <svg
          className="chart__svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${id}-title`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setHover(null)}
        >
          <title id={`${id}-title`}>車手累積積分走勢，第 1 到第 {rounds.at(-1)} 站</title>

          {/* 格線與 Y 軸刻度 —— 退居背景的細線 */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line className="chart__grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text className="chart__tick" x={PAD.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle">
                {tick}
              </text>
            </g>
          ))}

          {/* X 軸刻度 */}
          {rounds.map((round, i) => (
            <text key={round} className="chart__tick" x={x(i)} y={HEIGHT - PAD.bottom + 18} textAnchor="middle">
              R{round}
            </text>
          ))}

          {/* 淡化的其餘車手 —— 先畫，讓高亮線疊在上面 */}
          {muted.map((s) => (
            <path key={s.driver.id} className="chart__line chart__line--muted" d={pathOf(s)} />
          ))}

          {/* 高亮的前幾名 */}
          {highlighted.map((s) => (
            <path
              key={s.driver.id}
              className="chart__line"
              d={pathOf(s)}
              stroke={s.team?.colour ?? 'var(--text-dim)'}
              strokeDasharray={s.teammateIndex === 1 ? DASH : undefined}
            />
          ))}

          {/* 十字線：吸附到最近的 Round */}
          {hover !== null && (
            <line className="chart__crosshair" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
          )}

          {/* 末端標記（有 2px 底色環）與直接標示 */}
          {highlighted.map((s) => (
            <circle
              key={s.driver.id}
              className="chart__marker"
              cx={x(n - 1)}
              cy={y(s.cumulative.at(-1) ?? 0)}
              r={4}
              fill={s.team?.colour ?? 'var(--text-dim)'}
            />
          ))}
          {endLabels.map(({ series: s, anchorY, labelY, nudged }) => (
            <g key={s.driver.id}>
              {nudged && (
                <line className="chart__leader" x1={x(n - 1) + 6} y1={anchorY} x2={x(n - 1) + 12} y2={labelY} />
              )}
              <text className="chart__end-label" x={x(n - 1) + 14} y={labelY} dominantBaseline="middle">
                {codeOf(s)}
              </text>
            </g>
          ))}

          {/* 十字線上的點 */}
          {hover !== null &&
            highlighted.map((s) => (
              <circle
                key={s.driver.id}
                className="chart__marker"
                cx={x(hover)}
                cy={y(s.cumulative[hover] ?? 0)}
                r={4}
                fill={s.team?.colour ?? 'var(--text-dim)'}
              />
            ))}
        </svg>

        {/*
         * Tooltip 只在 hover 時出現 —— 靜止時末端標示與 legend 已經說明最終狀態，
         * 常駐的 tooltip 只會蓋住右側的線。值在前、名稱在後；線段色鍵承擔 identity。
         */}
        {hover !== null && (
        <div
          className="chart__tooltip"
          style={{ left: `${(x(hoverIndex) / WIDTH) * 100}%` }}
          role="status"
          aria-live="polite"
        >
          <p className="chart__tooltip-title">第 {rounds[hoverIndex]} 站後</p>
          <ol className="chart__tooltip-rows">
            {tooltipRows.map(({ series: s, value }) => (
              <li key={s.driver.id}>
                <span
                  className="chart__key"
                  style={{ borderColor: s.team?.colour ?? 'var(--text-dim)', borderStyle: s.teammateIndex === 1 ? 'dashed' : 'solid' }}
                />
                <strong>{value}</strong>
                <span>{nameOf(s)}</span>
              </li>
            ))}
          </ol>
        </div>
        )}
      </div>

      {/* Legend：兩條以上一定要有，identity 不能只靠顏色 */}
      <ul className="chart__legend">
        {highlighted.map((s) => (
          <li key={s.driver.id}>
            <span
              className="chart__key"
              style={{ borderColor: s.team?.colour ?? 'var(--text-dim)', borderStyle: s.teammateIndex === 1 ? 'dashed' : 'solid' }}
            />
            {nameOf(s)}
          </li>
        ))}
        {muted.length > 0 && (
          <li>
            <span className="chart__key chart__key--muted" />
            其餘 {muted.length} 位
          </li>
        )}
      </ul>

      {/* 表格檢視：不靠 hover 也拿得到每一個值 */}
      <details className="chart__table">
        <summary>以表格檢視</summary>
        <div className="chart__table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">車手</th>
                {rounds.map((round) => (
                  <th key={round} scope="col">
                    R{round}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.driver.id}>
                  <th scope="row">{nameOf(s)}</th>
                  {s.cumulative.map((v, i) => (
                    <td key={i}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
};
