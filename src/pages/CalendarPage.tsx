import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { RaceResult, WeekendView } from '../domain/types.ts';
import { useEntrance, type Entrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { Flag } from '../app/Flag.tsx';
import { localisedCircuit, localisedDriver, localisedRaceWeekend } from '../data/localisation.ts';
import { formatCompactCountdown, formatRaceDate } from '../app/formatting.ts';

interface CalendarPageProps {
  season: string;
  weekends: WeekendView[];
  /** Next Session 所在的 Round，用來標出「下一站」。 */
  nextRound: number | null;
  nowMs: number;
  timeZone: string;
}

export const CalendarPage = ({
  season,
  weekends,
  nextRound,
  nowMs,
  timeZone,
}: CalendarPageProps): JSX.Element => {
  const { container, item } = useEntrance();
  const completed = weekends.filter((w) => w.raceStatus === 'finished').length;

  return (
    <motion.section className="listing" variants={container} initial="hidden" animate="shown">
      <motion.header className="listing__head" variants={item}>
        <p className="hero__eyebrow">
          {season} 賽季 · 已完成 {completed} / {weekends.length} 站
        </p>
        <h1 className="listing__title">Calendar</h1>
      </motion.header>

      <ol className="calendar">
        {weekends.map((weekend) => (
          <CalendarRow
            key={weekend.round}
            weekend={weekend}
            isNext={weekend.round === nextRound}
            nowMs={nowMs}
            timeZone={timeZone}
            variants={item}
          />
        ))}
      </ol>
    </motion.section>
  );
};

interface CalendarRowProps {
  weekend: WeekendView;
  isNext: boolean;
  nowMs: number;
  timeZone: string;
  variants: Entrance['item'];
}

const CalendarRow = ({ weekend, isNext, nowMs, timeZone, variants }: CalendarRowProps): JSX.Element => {
  const race = weekend.sessions.find((s) => s.kind === 'race');
  const classes = ['calendar__row', `calendar__row--${weekend.raceStatus}`, isNext ? 'calendar__row--next' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <motion.li variants={variants}>
      <Link to={`/races/${weekend.round}`} className={classes}>
        <span className="calendar__round">R{weekend.round}</span>

        <span className="calendar__date">{race ? formatRaceDate(race.startsAt, timeZone) : '—'}</span>

        <span className="calendar__identity">
          <Flag country={weekend.circuit.country} />
          <span className="calendar__names">
            <BilingualName
              canonical={weekend.name}
              localised={localisedRaceWeekend(weekend.name)}
              variant="panel"
            />
            <span className="calendar__circuit">
              <BilingualName canonical={weekend.circuit.name} localised={localisedCircuit(weekend.circuit.id)} />
            </span>
          </span>
        </span>

        <span className="calendar__status">
          {weekend.raceStatus === 'finished' && <Podium podium={weekend.podium} />}
          {weekend.raceStatus === 'live' && <span className="pill">進行中</span>}
          {weekend.raceStatus === 'upcoming' && race && (
            <span className="calendar__countdown">
              {isNext ? '下一站 · ' : ''}
              倒數 <strong>{formatCompactCountdown(Date.parse(race.startsAt) - nowMs)}</strong>
            </span>
          )}
        </span>
      </Link>
    </motion.li>
  );
};

/** 前三名 —— 以車隊代表色的小圓點 + 姓氏呈現，不佔太多空間。 */
const Podium = ({ podium }: { podium: RaceResult[] }): JSX.Element => (
  <ol className="podium">
    {podium.map((result) => (
      <li key={result.driver.id} className="podium__entry">
        <span className="podium__position">{result.position}</span>
        <span className="podium__dot" style={{ background: result.team.colour ?? 'var(--text-dim)' }} />
        <span className="podium__name">
          {localisedDriver(result.driver.id)?.zh ?? result.driver.familyName}
        </span>
      </li>
    ))}
  </ol>
);
