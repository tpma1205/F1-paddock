import type { JSX } from 'react';
import { Link, useParams } from 'react-router';
import { motion, type MotionStyle } from 'motion/react';
import type { DriverSummary, TeamView } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { TeamLogo } from '../app/TeamLogo.tsx';
import { DriverPhoto } from '../app/DriverPhoto.tsx';
import { readableOn } from '../app/colour.ts';
import { localisedDriver, localisedTeam } from '../data/localisation.ts';

const PAGE_BACKGROUND = '#07070a';

interface TeamPageProps {
  season: string;
  teams: TeamView[];
}

export const TeamPage = ({ season, teams }: TeamPageProps): JSX.Element => {
  const { teamId } = useParams();
  const team = teams.find((candidate) => candidate.id === teamId);
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

  const accent = team.colour ?? '#8b8b96';
  // motion 元件的 style 型別是 MotionStyle，自訂屬性需經此斷言。
  const style = {
    '--team-colour': accent,
    '--team-text': readableOn(accent, PAGE_BACKGROUND),
  } as MotionStyle;

  return (
    <motion.article
      className="team-detail"
      style={style}
      variants={container}
      initial="hidden"
      animate="shown"
    >
      <motion.p className="breadcrumb" variants={item}>
        <Link to="/teams">車隊</Link>
        <span aria-hidden="true">/</span>
        <span>{team.name}</span>
      </motion.p>

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
    </motion.article>
  );
};

interface DriverCardProps {
  entry: DriverSummary;
  colour: string;
  variants: ReturnType<typeof useEntrance>['item'];
}

const DriverCard = ({ entry, colour, variants }: DriverCardProps): JSX.Element => {
  const { driver } = entry;
  const fullName = `${driver.givenName} ${driver.familyName}`;

  return (
    <motion.li className="driver-card" variants={variants}>
      <Link to={`/drivers/${driver.id}`} className="driver-card__photo" aria-label={fullName}>
        <DriverPhoto driver={driver} colour={colour} />
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
