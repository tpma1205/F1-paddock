import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion, type MotionStyle } from 'motion/react';
import type { Highlight, PointsProgression, SeasonHighlights } from '../domain/types.ts';
import { useEntrance, type Entrance } from './motion.ts';
import { DriverPhoto } from './DriverPhoto.tsx';
import { PointsChart } from './PointsChart.tsx';
import { localisedDriver } from '../data/localisation.ts';

interface InsightsSectionProps {
  season: string;
  progression: PointsProgression;
  highlights: SeasonHighlights;
}

/** 首頁的本季數據：四個亮點 + 積分走勢圖。 */
export const InsightsSection = ({ season, progression, highlights }: InsightsSectionProps): JSX.Element => {
  const { container, item } = useEntrance();

  return (
    <motion.section
      className="insights"
      variants={container}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
    >
      <motion.header className="standings__head" variants={item}>
        <p className="hero__eyebrow">{season} 賽季 · 數據亮點</p>
        <h2 className="standings__title">Insights</h2>
      </motion.header>

      <ul className="highlight-grid">
        <HighlightTile label="最多勝" highlight={highlights.mostWins} unit="勝" variants={item} />
        <HighlightTile label="最多桿位" highlight={highlights.mostPoles} unit="次" variants={item} />
        <HighlightTile label="最多頒獎台" highlight={highlights.mostPodiums} unit="次" variants={item} />
        <HighlightTile label="最多退賽" highlight={highlights.mostRetirements} unit="次" variants={item} />
      </ul>

      <motion.div className="insights__chart" variants={item}>
        <h3 className="section-title">積分走勢</h3>
        <PointsChart progression={progression} />
      </motion.div>
    </motion.section>
  );
};

interface HighlightTileProps {
  label: string;
  highlight: Highlight | null;
  unit: string;
  variants: Entrance['item'];
}

/**
 * 亮點磚：一個數字、一位車手。
 * 數字用文字色而非車隊色（文字不穿系列色）；identity 由照片與色條承擔。
 */
const HighlightTile = ({ label, highlight, unit, variants }: HighlightTileProps): JSX.Element => {
  const accent = highlight?.team?.colour ?? '#8b8b96';
  const style = { '--team-colour': accent } as MotionStyle;

  return (
    <motion.li className="highlight" style={style} variants={variants}>
      <span className="highlight__label">{label}</span>
      {highlight ? (
        <Link to={`/drivers/${highlight.driver.id}`} className="highlight__body">
          <DriverPhoto driver={highlight.driver} colour={accent} />
          <span className="highlight__figure">
            <span className="highlight__value">{highlight.count}</span>
            <span className="highlight__unit">{unit}</span>
          </span>
          <span className="highlight__name">
            {localisedDriver(highlight.driver.id)?.zh ?? highlight.driver.familyName}
          </span>
        </Link>
      ) : (
        <span className="highlight__none">尚無資料</span>
      )}
    </motion.li>
  );
};
