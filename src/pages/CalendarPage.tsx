import type { JSX } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { ResultView, WeekendView } from '../domain/types.ts';
import { useEntrance, type Entrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { Flag } from '../app/Flag.tsx';
import { localisedCircuit, localisedDriver, localisedRaceWeekend } from '../data/localisation.ts';
import { formatCompactCountdown, formatRaceDate } from '../app/formatting.ts';
import { buildCalendar } from '../domain/ics.ts';

interface CalendarPageProps {
  season: string;
  weekends: WeekendView[];
  /** Next Session 所在的 Round，用來標出「下一站」。 */
  nextRound: number | null;
  nowMs: number;
  timeZone: string;
  /** 快照時間，作為 .ics 的 DTSTAMP。 */
  fetchedAt: string;
}

/**
 * 產生並下載整季的 .ics。時間以 UTC 寫入，匯入 Google／Apple 日曆後會
 * 自動換算成使用者時區（見 domain/ics.ts）。
 */
const downloadCalendar = (season: string, weekends: WeekendView[], fetchedAt: string): void => {
  const siteUrl = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '');
  const ics = buildCalendar({
    season,
    weekends,
    stamp: fetchedAt,
    siteUrl,
    localiseRace: (name) => localisedRaceWeekend(name)?.zh ?? null,
  });
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `f1-${season}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const CalendarPage = ({
  season,
  weekends,
  nextRound,
  nowMs,
  timeZone,
  fetchedAt,
}: CalendarPageProps): JSX.Element => {
  const { container, item } = useEntrance();
  const completed = weekends.filter((w) => w.raceStatus === 'finished').length;

  return (
    <motion.section className="listing" variants={container} initial="hidden" animate="shown">
      <motion.header className="listing__head listing__head--row" variants={item}>
        <div>
          <p className="hero__eyebrow">
            {season} 賽季 · 已完成 {completed} / {weekends.length} 站
          </p>
          <h1 className="listing__title">Calendar</h1>
        </div>
        <button
          type="button"
          className="button"
          onClick={() => downloadCalendar(season, weekends, fetchedAt)}
        >
          加入行事曆（.ics）
        </button>
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
const Podium = ({ podium }: { podium: ResultView[] }): JSX.Element => (
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
