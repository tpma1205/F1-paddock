import { useMemo, type JSX } from 'react';
import { bundledSnapshot } from './data/snapshot.ts';
import { buildViewModel } from './domain/viewModel.ts';
import { useNow } from './app/useNow.ts';
import {
  SESSION_LABEL,
  formatFetchedAt,
  formatTimeZoneLabel,
  pad2,
  resolveTimeZone,
  toCountdown,
} from './app/formatting.ts';

/**
 * 票 01 的曳光彈畫面。
 *
 * **刻意不做視覺** —— 只求資料正確、倒數會動、時區標示清楚。
 * 設計系統與完整場次面板見票 02。
 */
export const App = (): JSX.Element => {
  const now = useNow();
  const timeZone = useMemo(resolveTimeZone, []);
  const viewModel = useMemo(() => buildViewModel(bundledSnapshot, now), [now]);

  const { season, fetchedAt, nextSession, focusWeekend, isOffSeason } = viewModel;

  return (
    <main className="hero">
      <p className="eyebrow">
        {season} 賽季
        {focusWeekend ? ` · 第 ${focusWeekend.round} 站` : ''}
      </p>

      {isOffSeason || !nextSession ? (
        <>
          <h1>本季已結束</h1>
          <p className="note">下一季賽程公布後，此處將顯示開幕倒數。</p>
        </>
      ) : (
        <>
          <h1>
            {nextSession.weekend.name}
            <span className="circuit">{nextSession.weekend.circuit.name}</span>
          </h1>

          <p className="session-label">
            {SESSION_LABEL[nextSession.session.kind]}
            {nextSession.session.status === 'live' && <span className="live">進行中</span>}
          </p>

          {nextSession.session.status === 'live' ? (
            <p className="countdown live-text">正在進行</p>
          ) : (
            <Countdown ms={nextSession.msUntilStart} />
          )}
        </>
      )}

      <footer className="meta">
        <span>{formatTimeZoneLabel(now, timeZone)}</span>
        <span>資料更新於 {formatFetchedAt(fetchedAt, timeZone)}</span>
      </footer>
    </main>
  );
};

const Countdown = ({ ms }: { ms: number }): JSX.Element => {
  const { days, hours, minutes, seconds } = toCountdown(ms);

  return (
    <p className="countdown">
      {days > 0 && (
        <>
          <span className="value">{days}</span>
          <span className="unit">天</span>
        </>
      )}
      <span className="value">{pad2(hours)}</span>
      <span className="unit">時</span>
      <span className="value">{pad2(minutes)}</span>
      <span className="unit">分</span>
      <span className="value">{pad2(seconds)}</span>
      <span className="unit">秒</span>
    </p>
  );
};
