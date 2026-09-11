import type { JSX } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'motion/react';
import type { RaceResult, WeekendView } from '../domain/types.ts';
import { useEntrance } from '../app/motion.ts';
import { BilingualName } from '../app/BilingualName.tsx';
import { DriverPhoto } from '../app/DriverPhoto.tsx';
import { Flag } from '../app/Flag.tsx';
import { SessionPanel } from '../app/SessionPanel.tsx';
import { readableOn } from '../app/colour.ts';
import { localisedCircuit, localisedDriver, localisedRaceWeekend, localisedTeam } from '../data/localisation.ts';
import { formatRaceDate } from '../app/formatting.ts';

const CARD_BACKGROUND = '#101014';

/** Jolpica 的狀態字串 → 介面文字。未列的原樣顯示。 */
const STATUS_LABEL: Record<string, string> = {
  Finished: '完賽',
  Lapped: '落後一圈以上',
  Retired: '退賽',
  'Did not start': '未起跑',
  Disqualified: '失格',
  Withdrew: '退出',
};

interface RacePageProps {
  season: string;
  weekends: WeekendView[];
  nextRound: number | null;
  msUntilNext: number;
  timeZone: string;
  timeZoneLabel: string;
}

export const RacePage = ({
  season,
  weekends,
  nextRound,
  msUntilNext,
  timeZone,
  timeZoneLabel,
}: RacePageProps): JSX.Element => {
  const { round } = useParams();
  const weekend = weekends.find((w) => String(w.round) === round);
  const { container, item } = useEntrance();

  if (!weekend) {
    return (
      <section className="listing">
        <h1 className="listing__title">找不到這一站</h1>
        <p className="hero__note">
          <Link to="/calendar">← 回賽程表</Link>
        </p>
      </section>
    );
  }

  const race = weekend.sessions.find((s) => s.kind === 'race');
  const nextSessionKind =
    weekend.round === nextRound
      ? (weekend.sessions.find((s) => s.status !== 'finished')?.kind ?? null)
      : null;

  return (
    <motion.article className="race-detail" variants={container} initial="hidden" animate="shown">
      <motion.p className="breadcrumb" variants={item}>
        <Link to="/calendar">賽程表</Link>
        <span aria-hidden="true">/</span>
        <span>R{weekend.round}</span>
      </motion.p>

      <motion.header className="race-detail__head" variants={item}>
        <p className="hero__eyebrow">
          {season} 賽季 · 第 {weekend.round} 站
          {race && <> · {formatRaceDate(race.startsAt, timeZone)}</>}
        </p>
        <h1 className="hero__title hero__title--compact">
          <BilingualName
            canonical={weekend.name}
            localised={localisedRaceWeekend(weekend.name)}
            variant="hero"
          />
        </h1>
        <p className="race-detail__place">
          <Flag country={weekend.circuit.country} />
          <Link to={`/circuits/${weekend.circuit.id}`}>
            <BilingualName
              canonical={weekend.circuit.name}
              localised={localisedCircuit(weekend.circuit.id)}
            />
          </Link>
        </p>
      </motion.header>

      {weekend.results ? (
        <>
          <motion.h2 className="section-title" variants={item}>
            正賽結果
          </motion.h2>
          <ol className="results">
            {weekend.results.map((result) => (
              <ResultRow key={result.driver.id} result={result} />
            ))}
          </ol>
        </>
      ) : (
        <>
          <motion.p className="hero__note" variants={item}>
            {weekend.raceStatus === 'live' ? '正賽進行中，賽果將於賽後更新。' : '尚未舉行，以下為本週末場次。'}
          </motion.p>
          <SessionPanel
            weekend={weekend}
            nextSessionKind={nextSessionKind}
            msUntilNext={msUntilNext}
            timeZone={timeZone}
            timeZoneLabel={timeZoneLabel}
          />
        </>
      )}
    </motion.article>
  );
};

/**
 * 一列賽果。窄螢幕只保留名次／車手／積分，其餘收進可展開的 <details>；
 * 桌機版所有欄位攤平顯示、展開機制以 CSS 停用。
 */
const ResultRow = ({ result }: { result: RaceResult }): JSX.Element => {
  const { driver, team } = result;
  const accent = team.colour ?? '#8b8b96';
  const style = {
    '--team-colour': accent,
    '--team-text': readableOn(accent, CARD_BACKGROUND),
  } as React.CSSProperties;
  const statusLabel = STATUS_LABEL[result.status] ?? result.status;
  const outcome = result.classified ? (result.time ?? statusLabel) : statusLabel;

  return (
    <li className={`result ${result.classified ? '' : 'result--unclassified'}`} style={style}>
      <details className="result__details">
        <summary className="result__row">
          <span className="result__position">{result.positionText}</span>
          <DriverPhoto driver={driver} colour={accent} />
          <span className="result__driver">
            <BilingualName
              canonical={`${driver.givenName} ${driver.familyName}`}
              localised={localisedDriver(driver.id)}
              variant="panel"
            />
            <span className="result__team">
              <BilingualName canonical={team.name} localised={localisedTeam(team.id)} />
            </span>
          </span>
          <span className="result__cell result__cell--secondary">
            <span className="result__label">起跑</span>
            {result.grid > 0 ? `P${result.grid}` : '維修道'}
          </span>
          <span className="result__cell result__cell--secondary">
            <span className="result__label">圈數</span>
            {result.laps}
          </span>
          <span className="result__cell result__cell--secondary result__cell--outcome">
            <span className="result__label">時間／狀態</span>
            {outcome}
            {result.fastestLap && (
              <span className="result__fastest" title="最速圈">
                FL
              </span>
            )}
          </span>
          <span className="result__points">
            <span className="stat__value">{result.points}</span>
            <span className="stat__label">積分</span>
          </span>
        </summary>

        <dl className="result__more">
          <div>
            <dt>起跑</dt>
            <dd>{result.grid > 0 ? `P${result.grid}` : '維修道'}</dd>
          </div>
          <div>
            <dt>圈數</dt>
            <dd>{result.laps}</dd>
          </div>
          <div>
            <dt>時間／狀態</dt>
            <dd>
              {outcome}
              {result.fastestLap && ' · 最速圈'}
            </dd>
          </div>
        </dl>
      </details>
    </li>
  );
};
