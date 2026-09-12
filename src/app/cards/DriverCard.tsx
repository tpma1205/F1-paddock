import type { JSX } from 'react';
import { SURFACE, NEUTRAL_ACCENT } from '../tokens.ts';
import { Link } from 'react-router';
import { motion, type MotionStyle } from 'motion/react';
import type { DriverRef } from '../../domain/types.ts';
import type { Entrance } from '../motion.ts';
import { BilingualName } from '../BilingualName.tsx';
import { DriverPhoto } from '../DriverPhoto.tsx';
import { readableOn } from '../colour.ts';
import { localisedDriver } from '../../data/localisation.ts';


/** DriverView 與 DriverSummary 都符合這個形狀 —— 卡片不在乎資料從哪來。 */
interface DriverCardEntry {
  driver: DriverRef;
  position: number;
  points: number;
  wins: number;
}

interface DriverCardProps {
  entry: DriverCardEntry;
  /** 所屬車隊代表色。 */
  colour: string | null;
  variants: Entrance['item'];
}

/** 車手卡片 —— 車隊詳情頁的陣容與首頁預覽共用同一個元件。 */
export const DriverCard = ({ entry, colour, variants }: DriverCardProps): JSX.Element => {
  const { driver } = entry;
  const fullName = `${driver.givenName} ${driver.familyName}`;
  const accent = colour ?? NEUTRAL_ACCENT;
  const style = {
    '--team-colour': accent,
    '--team-text': readableOn(accent, SURFACE),
  } as MotionStyle;

  return (
    <motion.li className="driver-card" style={style} variants={variants}>
      <Link to={`/drivers/${driver.id}`} className="driver-card__photo" aria-label={fullName}>
        <DriverPhoto driver={driver} colour={accent} />
      </Link>
      <span className="driver-card__number">{driver.permanentNumber ?? '—'}</span>
      <span className="driver-card__name">
        <BilingualName canonical={fullName} localised={localisedDriver(driver.id)} variant="panel" />
      </span>
      <span className="driver-card__stats">
        <span className="stat">
          <span className="stat__value">{entry.position}</span>
          <span className="stat__label">名次</span>
        </span>
        <span className="stat">
          <span className="stat__value">{entry.points}</span>
          <span className="stat__label">積分</span>
        </span>
        <span className="stat">
          <span className="stat__value">{entry.wins}</span>
          <span className="stat__label">勝場</span>
        </span>
      </span>
    </motion.li>
  );
};
