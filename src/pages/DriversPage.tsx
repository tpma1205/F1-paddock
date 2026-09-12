import type { JSX } from 'react';
import { SURFACE, NEUTRAL_ACCENT } from '../app/tokens.ts';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { DriverView } from '../domain/types.ts';
import { useEntrance, type Entrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { DriverPhoto } from '../app/DriverPhoto.tsx';
import { readableOn } from '../app/colour.ts';
import { localisedDriver, localisedTeam } from '../data/localisation.ts';


interface DriversPageProps {
  season: string;
  drivers: DriverView[];
}

export const DriversPage = ({ season, drivers }: DriversPageProps): JSX.Element => {
  const { container, item } = useEntrance();

  return (
    <motion.section className="listing" variants={container} initial="hidden" animate="shown">
      <motion.header className="listing__head" variants={item}>
        <p className="hero__eyebrow">{season} 賽季 · 車手積分榜</p>
        <h1 className="listing__title">Drivers</h1>
      </motion.header>

      <ul className="driver-list">
        {drivers.map((entry) => (
          <DriverRow key={entry.driver.id} entry={entry} variants={item} />
        ))}
      </ul>
    </motion.section>
  );
};

interface DriverRowProps {
  entry: DriverView;
  variants: Entrance['item'];
}

const DriverRow = ({ entry, variants }: DriverRowProps): JSX.Element => {
  const { driver, team } = entry;
  const accent = team?.colour ?? NEUTRAL_ACCENT;
  const style = {
    '--team-colour': accent,
    '--team-text': readableOn(accent, SURFACE),
  } as React.CSSProperties;

  return (
    <motion.li variants={variants}>
      <Link to={`/drivers/${driver.id}`} className="driver-row" style={style}>
        <span className="driver-row__position">{entry.position}</span>
        <DriverPhoto driver={driver} colour={accent} />
        <span className="driver-row__identity">
          <span className="driver-row__number">{driver.permanentNumber ?? '—'}</span>
          <BilingualName
            canonical={`${driver.givenName} ${driver.familyName}`}
            localised={localisedDriver(driver.id)}
            variant="panel"
          />
          {team && (
            <span className="driver-row__team">
              <BilingualName canonical={team.name} localised={localisedTeam(team.id)} />
            </span>
          )}
        </span>
        <span className="driver-row__points">
          <span className="stat__value">{entry.points}</span>
          <span className="stat__label">積分</span>
        </span>
      </Link>
    </motion.li>
  );
};
