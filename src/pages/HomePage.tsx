import type { JSX } from 'react';
import { motion } from 'motion/react';
import type { ViewModel } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { SessionPanel } from '../app/SessionPanel.tsx';
import { BilingualName } from '../app/BilingualName.tsx';
import { localisedCircuit, localisedRaceWeekend } from '../data/localisation.ts';
import { SESSION_LABEL, pad2, toCountdown } from '../app/formatting.ts';

interface HomePageProps {
  viewModel: ViewModel;
  timeZone: string;
  timeZoneLabel: string;
}

export const HomePage = ({ viewModel, timeZone, timeZoneLabel }: HomePageProps): JSX.Element => {
  const { container, item } = useEntrance();
  const { season, nextSession, focusWeekend, isOffSeason } = viewModel;

  return (
    <>
      <motion.section className="hero" variants={container} initial="hidden" animate="shown">
        <motion.p className="hero__eyebrow" variants={item}>
          {season} 賽季
          {focusWeekend && <> · 第 {focusWeekend.round} 站</>}
        </motion.p>

        {isOffSeason || !nextSession ? (
          <>
            <motion.h1 className="hero__title" variants={item}>
              本季已結束
            </motion.h1>
            <motion.p className="hero__note" variants={item}>
              下一季賽程公布後，此處將顯示開幕倒數。
            </motion.p>
          </>
        ) : (
          <>
            <motion.h1 className="hero__title" variants={item}>
              <BilingualName
                canonical={nextSession.weekend.name}
                localised={localisedRaceWeekend(nextSession.weekend.name)}
                variant="hero"
              />
            </motion.h1>

            <motion.p className="hero__circuit" variants={item}>
              <BilingualName
                canonical={nextSession.weekend.circuit.name}
                localised={localisedCircuit(nextSession.weekend.circuit.id)}
              />
              <span className="hero__locality">
                {nextSession.weekend.circuit.locality}, {nextSession.weekend.circuit.country}
              </span>
            </motion.p>

            <motion.div className="hero__next" variants={item}>
              <p className="hero__session">
                {SESSION_LABEL[nextSession.session.kind]}
                {nextSession.session.status === 'live' && <span className="pill">進行中</span>}
              </p>

              {nextSession.session.status === 'live' ? (
                <p className="hero__live">正在進行</p>
              ) : (
                <HeroCountdown ms={nextSession.msUntilStart} />
              )}
            </motion.div>
          </>
        )}
      </motion.section>

      {focusWeekend && nextSession && (
        <SessionPanel
          weekend={focusWeekend}
          nextSessionKind={nextSession.session.kind}
          msUntilNext={nextSession.msUntilStart}
          timeZone={timeZone}
          timeZoneLabel={timeZoneLabel}
        />
      )}
    </>
  );
};

const HeroCountdown = ({ ms }: { ms: number }): JSX.Element => {
  const { days, hours, minutes, seconds } = toCountdown(ms);

  return (
    <p className="countdown">
      {days > 0 && (
        <span className="countdown__part">
          <span className="countdown__value">{days}</span>
          <span className="countdown__unit">天</span>
        </span>
      )}
      <span className="countdown__part">
        <span className="countdown__value">{pad2(hours)}</span>
        <span className="countdown__unit">時</span>
      </span>
      <span className="countdown__part">
        <span className="countdown__value">{pad2(minutes)}</span>
        <span className="countdown__unit">分</span>
      </span>
      <span className="countdown__part">
        <span className="countdown__value">{pad2(seconds)}</span>
        <span className="countdown__unit">秒</span>
      </span>
    </p>
  );
};
