import type { JSX } from 'react';
import { GROUND, NEUTRAL_ACCENT } from '../app/tokens.ts';
import { Link, useParams } from 'react-router';
import { motion, type MotionStyle } from 'motion/react';
import type { TeamView } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { TeamLogo } from '../app/TeamLogo.tsx';
import { DriverCard } from '../app/cards/DriverCard.tsx';
import { TeammateBattleCard } from '../app/TeammateBattleCard.tsx';
import type { TeammateBattle } from '../domain/types.ts';
import { readableOn } from '../app/colour.ts';
import { localisedTeam } from '../data/localisation.ts';


interface TeamPageProps {
  season: string;
  teams: TeamView[];
  battles: TeammateBattle[];
}

export const TeamPage = ({ season, teams, battles }: TeamPageProps): JSX.Element => {
  const { teamId } = useParams();
  const team = teams.find((candidate) => candidate.id === teamId);
  const battle = battles.find((candidate) => candidate.teamId === teamId);
  const { container, item } = useEntrance();

  if (!team) {
    return (
      <section className="listing">
        <h1 className="listing__title">找不到這支車隊</h1>
        <p className="hero__note">
          <Link to="/teams">← 回車隊列表</Link>
        </p>
      </section>
    );
  }

  const accent = team.colour ?? NEUTRAL_ACCENT;
  // motion 元件的 style 型別是 MotionStyle，自訂屬性需經此斷言。
  const style = {
    '--team-colour': accent,
    '--team-text': readableOn(accent, GROUND),
  } as MotionStyle;

  return (
    <motion.article
      className="team-detail"
      style={style}
      variants={container}
      initial="hidden"
      animate="shown"
    >
      <motion.header className="team-detail__head" variants={item}>
        <TeamLogo team={team} size="hero" />
        <div>
          <p className="hero__eyebrow">
            {season} 賽季 · 第 {team.position} 名
          </p>
          <h1 className="hero__title hero__title--compact">
            <BilingualName canonical={team.name} localised={localisedTeam(team.id)} variant="hero" />
          </h1>
        </div>
      </motion.header>

      <motion.ul className="stat-row" variants={item}>
        <li className="stat stat--large">
          <span className="stat__value">{team.position}</span>
          <span className="stat__label">名次</span>
        </li>
        <li className="stat stat--large">
          <span className="stat__value">{team.points}</span>
          <span className="stat__label">積分</span>
        </li>
        <li className="stat stat--large">
          <span className="stat__value">{team.wins}</span>
          <span className="stat__label">勝場</span>
        </li>
      </motion.ul>

      <motion.h2 className="section-title" variants={item}>
        車手陣容
      </motion.h2>

      <ul className="driver-grid">
        {team.drivers.map((entry) => (
          <DriverCard key={entry.driver.id} entry={entry} colour={accent} variants={item} />
        ))}
      </ul>

      {battle && (
        <>
          <motion.h2 className="section-title" variants={item}>
            隊友對決
          </motion.h2>
          <motion.div variants={item}>
            <TeammateBattleCard battle={battle} colour={team.colour} />
          </motion.div>
        </>
      )}
    </motion.article>
  );
};
