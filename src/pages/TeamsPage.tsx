import type { JSX } from 'react';
import { motion } from 'motion/react';
import type { TeamView } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { TeamCard } from '../app/cards/TeamCard.tsx';

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
