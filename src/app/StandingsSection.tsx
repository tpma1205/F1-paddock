import type { JSX } from 'react';
import { SURFACE, NEUTRAL_ACCENT } from './tokens.ts';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { DriverView, TeamView } from '../domain/types.ts';
import { useEntrance, type Entrance } from './motion.ts';
import { AnimatedNumber } from './AnimatedNumber.tsx';
import { BilingualName } from './BilingualName.tsx';
import { readableOn } from './colour.ts';
import { localisedDriver, localisedTeam } from '../data/localisation.ts';

const TOP_N = 5;

interface StandingsSectionProps {
  /** 積分所屬的球季 —— 新球季尚無積分時是上一季。 */
  season: string;
  /** 是否為該季最終結果。 */
  isFinal: boolean;
  completedRound: number | null;
  drivers: DriverView[];
  teams: TeamView[];
}

/**
 * 首頁的本季戰況：雙積分榜前幾名。
 *
 * 區塊的 `data-accent` 是積分領先車隊的代表色 —— 滾到這裡時頂部進度條
 * 會變成那個顏色（見 ScrollProgress）。
 */
export const StandingsSection = ({
  season,
  isFinal,
  completedRound,
  drivers,
  teams,
}: StandingsSectionProps): JSX.Element => {
  const { container, item } = useEntrance();
  const leaderColour = teams[0]?.colour ?? undefined;

  return (
    <motion.section
      className="standings"
      data-accent={leaderColour}
      variants={container}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
    >
      <motion.header className="standings__head" variants={item}>
        <p className="hero__eyebrow">
          {season} 賽季 · {isFinal ? '最終積分' : '本季戰況'}
          {!isFinal && completedRound !== null && <> · {completedRound} 站後</>}
        </p>
        <h2 className="standings__title">Standings</h2>
      </motion.header>

      <div className="standings__columns">
        <StandingsColumn title="車手" titleEn="Drivers" href="/drivers" variants={item}>
          {drivers.slice(0, TOP_N).map((entry) => {
            const accent = entry.team?.colour ?? NEUTRAL_ACCENT;
            return (
              <StandingsRow
                key={entry.driver.id}
                href={`/drivers/${entry.driver.id}`}
                position={entry.position}
                accent={accent}
                canonical={entry.driver.familyName}
                localised={localisedDriver(entry.driver.id)}
                sub={entry.team ? (localisedTeam(entry.team.id)?.zh ?? entry.team.name) : null}
                points={entry.points}
                variants={item}
              />
            );
          })}
        </StandingsColumn>

        <StandingsColumn title="車隊" titleEn="Teams" href="/teams" variants={item}>
          {teams.slice(0, TOP_N).map((team) => (
            <StandingsRow
              key={team.id}
              href={`/teams/${team.id}`}
              position={team.position}
              accent={team.colour ?? NEUTRAL_ACCENT}
              canonical={team.name}
              localised={localisedTeam(team.id)}
              sub={`${team.wins} 勝`}
              points={team.points}
              variants={item}
            />
          ))}
        </StandingsColumn>
      </div>
    </motion.section>
  );
};

interface StandingsColumnProps {
  title: string;
  titleEn: string;
  href: string;
  variants: Entrance['item'];
  children: React.ReactNode;
}

const StandingsColumn = ({ title, titleEn, href, variants, children }: StandingsColumnProps): JSX.Element => (
  <motion.div className="standings__column" variants={variants}>
    <div className="standings__column-head">
      <h3>
        {title}
        <span>{titleEn}</span>
      </h3>
      <Link to={href} className="standings__more">
        查看全部 →
      </Link>
    </div>
    <ol className="standings__list">{children}</ol>
  </motion.div>
);

interface StandingsRowProps {
  href: string;
  position: number;
  accent: string;
  canonical: string;
  localised: { zh: string; provisional?: true } | null;
  sub: string | null;
  points: number;
  variants: Entrance['item'];
}

const StandingsRow = ({
  href,
  position,
  accent,
  canonical,
  localised,
  sub,
  points,
  variants,
}: StandingsRowProps): JSX.Element => {
  const style = {
    '--team-colour': accent,
    '--team-text': readableOn(accent, SURFACE),
  } as React.CSSProperties;

  return (
    <motion.li variants={variants}>
      <Link to={href} className="standings__row" style={style}>
        <span className="standings__position">{position}</span>
        <span className="standings__name">
          <BilingualName canonical={canonical} localised={localised} variant="panel" />
          {sub && <span className="standings__sub">{sub}</span>}
        </span>
        <span className="standings__points">
          <AnimatedNumber value={points} />
        </span>
      </Link>
    </motion.li>
  );
};
