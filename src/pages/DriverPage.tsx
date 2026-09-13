import type { JSX } from 'react';
import { GROUND, NEUTRAL_ACCENT } from '../app/tokens.ts';
import { Link, useParams } from 'react-router';
import { motion, type MotionStyle } from 'motion/react';
import type { DriverView } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { DriverPhoto } from '../app/DriverPhoto.tsx';
import { readableOn } from '../app/colour.ts';
import { localisedDriver, localisedTeam } from '../data/localisation.ts';
import { localisedNationality } from '../app/nationalities.ts';
import { driverProfile } from '../data/profiles.ts';
import { ProfileSection } from '../app/ProfileSection.tsx';
import { Flag } from '../app/Flag.tsx';


interface DriverPageProps {
  season: string;
  drivers: DriverView[];
}

export const DriverPage = ({ season, drivers }: DriverPageProps): JSX.Element => {
  const { driverId } = useParams();
  const entry = drivers.find((candidate) => candidate.driver.id === driverId);
  const { container, item } = useEntrance();

  if (!entry) {
    return (
      <section className="listing">
        <h1 className="listing__title">找不到這位車手</h1>
        <p className="hero__note">
          <Link to="/drivers">← 回車手列表</Link>
        </p>
      </section>
    );
  }

  const { driver, team } = entry;
  const accent = team?.colour ?? NEUTRAL_ACCENT;
  const style = {
    '--team-colour': accent,
    '--team-text': readableOn(accent, GROUND),
  } as MotionStyle;
  const fullName = `${driver.givenName} ${driver.familyName}`;
  const nationality = localisedNationality(driver.nationality);

  return (
    <motion.article
      className="team-detail driver-detail"
      style={style}
      variants={container}
      initial="hidden"
      animate="shown"
    >
      <motion.header className="driver-detail__head" variants={item}>
        <DriverPhoto driver={driver} colour={accent} size="hero" />
        <div className="driver-detail__identity">
          <p className="hero__eyebrow">
            {season} 賽季 · 第 {entry.position} 名
            {driver.permanentNumber && <> · #{driver.permanentNumber}</>}
          </p>
          <h1 className="hero__title hero__title--compact">
            <BilingualName canonical={fullName} localised={localisedDriver(driver.id)} variant="hero" />
          </h1>
          {team && (
            <p className="driver-detail__team">
              <Link to={`/teams/${team.id}`}>
                <BilingualName canonical={team.name} localised={localisedTeam(team.id)} />
              </Link>
            </p>
          )}
        </div>
      </motion.header>

      <motion.dl className="facts" variants={item} aria-label="車手資料">
        {entry.age !== null && driver.dateOfBirth && (
          <div className="facts__item">
            <dt>年齡</dt>
            <dd>
              {entry.age} 歲<span className="facts__note">{driver.dateOfBirth}</span>
            </dd>
          </div>
        )}
        <div className="facts__item">
          <dt>國籍</dt>
          <dd className="facts__nationality">
            {nationality ? (
              <>
                <Flag country={nationality.country} />
                {nationality.zh}
              </>
            ) : (
              driver.nationality
            )}
          </dd>
        </div>
        {driver.permanentNumber && (
          <div className="facts__item">
            <dt>車號</dt>
            <dd>#{driver.permanentNumber}</dd>
          </div>
        )}
        {entry.seasonNumber !== null && (
          <div className="facts__item">
            <dt>資歷</dt>
            <dd>
              F1 第 {entry.seasonNumber} 季
              <span className="facts__note">{entry.isRookie ? '本季出道' : `${driver.debutSeason} 出道`}</span>
            </dd>
          </div>
        )}
      </motion.dl>

      <ProfileSection intro={driverProfile(driver.id)?.intro ?? null} variants={item} />

      <motion.ul className="stat-row" variants={item}>
        <li className="stat stat--large">
          <span className="stat__value">{entry.position}</span>
          <span className="stat__label">名次</span>
        </li>
        <li className="stat stat--large">
          <span className="stat__value">{entry.points}</span>
          <span className="stat__label">積分</span>
        </li>
        <li className="stat stat--large">
          <span className="stat__value">{entry.wins}</span>
          <span className="stat__label">勝場</span>
        </li>
        <li className="stat stat--large">
          <span className="stat__value">{entry.podiums ?? '—'}</span>
          <span className="stat__label">頒獎台</span>
        </li>
      </motion.ul>
    </motion.article>
  );
};
