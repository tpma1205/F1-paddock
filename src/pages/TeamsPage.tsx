import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { TeamView } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { TeamLogo } from '../app/TeamLogo.tsx';
import { readableOn } from '../app/colour.ts';
import { localisedTeam } from '../data/localisation.ts';

const CARD_BACKGROUND = '#101014';

interface TeamsPageProps {
  season: string;
  teams: TeamView[];
}

export const TeamsPage = ({ season, teams }: TeamsPageProps): JSX.Element => {
  const { container, item } = useEntrance();

  return (
    <motion.section className="listing" variants={container} initial="hidden" animate="shown">
      <motion.header className="listing__head" variants={item}>
        <p className="hero__eyebrow">{season} 賽季 · 車隊積分榜</p>
        <h1 className="listing__title">Teams</h1>
      </motion.header>

      <ul className="team-grid">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} variants={item} />
        ))}
      </ul>
    </motion.section>
  );
};

interface TeamCardProps {
  team: TeamView;
  variants: ReturnType<typeof useEntrance>['item'];
}

const TeamCard = ({ team, variants }: TeamCardProps): JSX.Element => {
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
