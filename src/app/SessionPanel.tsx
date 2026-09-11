import { motion } from 'motion/react';
import type { JSX } from 'react';
import type { SessionKind, SessionView, WeekendView } from '../domain/types.ts';
import { Flag } from './Flag.tsx';
import { BilingualName } from './BilingualName.tsx';
import { localisedCircuit, localisedRaceWeekend } from '../data/localisation.ts';
import { useEntrance, type Entrance } from './motion.ts';
import {
  SESSION_SHORT_LABEL,
  formatCompactCountdown,
  formatSessionClock,
  formatSessionDay,
} from './formatting.ts';

interface SessionPanelProps {
  weekend: WeekendView;
  /** Next Session 的種類；用它標出高亮的那一列。 */
  nextSessionKind: SessionKind | null;
  msUntilNext: number;
  timeZone: string;
  timeZoneLabel: string;
}

/**
 * 當前 Race Weekend 的完整場次表。
 *
 * **場次組成一律由資料決定** —— Sprint Weekend 會自動變成
 * FP1／衝刺排位／衝刺賽／排位／正賽，同一套版型吃得下，不需要分支。
 */
export const SessionPanel = ({
  weekend,
  nextSessionKind,
  msUntilNext,
  timeZone,
  timeZoneLabel,
}: SessionPanelProps): JSX.Element => {
  const { container, item } = useEntrance();

  return (
    <motion.section
      className="panel"
      variants={container}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
    >
      <motion.header className="panel__head" variants={item}>
        <Flag country={weekend.circuit.country} />
        <div className="panel__title">
          <h2>
            <BilingualName
              canonical={weekend.name}
              localised={localisedRaceWeekend(weekend.name)}
              variant="panel"
            />
          </h2>
          <p>
            <BilingualName
              canonical={weekend.circuit.name}
              localised={localisedCircuit(weekend.circuit.id)}
            />
            <span className="panel__locality">· {weekend.circuit.locality}</span>
          </p>
        </div>
        <span className="panel__round">R{weekend.round}</span>
      </motion.header>

      <motion.p className="panel__caption" variants={item}>
        本週末所有場次 · {timeZoneLabel}
      </motion.p>

      <ul className="sessions">
        {weekend.sessions.map((session) => (
          <SessionRow
            key={session.kind}
            session={session}
            isNext={session.kind === nextSessionKind}
            msUntilNext={msUntilNext}
            timeZone={timeZone}
            variants={item}
          />
        ))}
      </ul>
    </motion.section>
  );
};

interface SessionRowProps {
  session: SessionView;
  isNext: boolean;
  msUntilNext: number;
  timeZone: string;
  variants: Entrance['item'];
}

const SessionRow = ({
  session,
  isNext,
  msUntilNext,
  timeZone,
  variants,
}: SessionRowProps): JSX.Element => {
  const classes = ['session', `session--${session.status}`, isNext ? 'session--next' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <motion.li className={classes} variants={variants}>
      <span className="session__label">{SESSION_SHORT_LABEL[session.kind]}</span>

      <span className="session__time">
        <span className="session__day">{formatSessionDay(session.startsAt, timeZone)}</span>
        <span className="session__clock">{formatSessionClock(session.startsAt, timeZone)}</span>
      </span>

      <span className="session__status">
        {session.status === 'live' && <span className="pill">進行中</span>}
        {session.status === 'upcoming' && isNext && (
          <>
            即將登場 · 倒數 <strong>{formatCompactCountdown(msUntilNext)}</strong>
          </>
        )}
        {session.status === 'finished' && '已結束'}
      </span>
    </motion.li>
  );
};
