import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { TeamView } from '../../domain/types.ts';
import type { Entrance } from '../motion.ts';
import { BilingualName } from '../BilingualName.tsx';
import { TeamLogo } from '../TeamLogo.tsx';
import { readableOn } from '../colour.ts';
import { localisedTeam } from '../../data/localisation.ts';

const CARD_BACKGROUND = '#101014';

interface TeamCardProps {
  team: TeamView;
  variants: Entrance['item'];
}

/** 車隊卡片 —— 車隊列表與首頁預覽共用同一個元件。 */
export const TeamCard = ({ team, variants }: TeamCardProps): JSX.Element => {
  const accent = team.colour ?? '#8b8b96';
  // 代表色作為**裝飾**（色條、光暈）時保留原色；作為**文字**時提亮到可讀。
  const style = {
    '--team-colour': accent,
    '--team-text': readableOn(accent, CARD_BACKGROUND),
  } as React.CSSProperties;

  return (
    <motion.li variants={variants}>
      <Link to={`/teams/${team.id}`} className="team-card" style={style}>
        <span className="team-card__position">{team.position}</span>
        <TeamLogo team={team} />
        <span className="team-card__name">
          <BilingualName canonical={team.name} localised={localisedTeam(team.id)} variant="panel" />
        </span>
        <span className="team-card__stats">
          <span className="stat">
            <span className="stat__value">{team.points}</span>
            <span className="stat__label">積分</span>
          </span>
          <span className="stat">
            <span className="stat__value">{team.wins}</span>
            <span className="stat__label">勝場</span>
          </span>
        </span>
      </Link>
    </motion.li>
  );
};
