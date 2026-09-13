import { useId, useState, type JSX, type KeyboardEvent } from 'react';
import type { SessionKind, SessionView, WeekendView } from '../domain/types.ts';
import { SESSION_SHORT_LABEL, formatSessionClock, formatSessionDay } from './formatting.ts';

/**
 * 籤的固定順序：最想看的在最前面。只列出資料裡有的場次 —— 衝刺賽週末沒有
 * FP2／FP3，一般週末沒有衝刺賽，都由 weekend.sessions 決定。
 */
const TAB_ORDER: SessionKind[] = ['race', 'qualifying', 'sprint', 'sprintQualifying', 'fp3', 'fp2', 'fp1'];

interface SessionTabsProps {
  weekend: WeekendView;
  timeZone: string;
  /** 該籤的內容；只在場次已結束時呼叫。 */
  renderPanel: (session: SessionView) => JSX.Element;
}

/**
 * 單站頁的場次分頁籤：正賽｜排位賽｜FP3｜FP2｜FP1。
 *
 * 預設籤由 View Model 的 latestFinishedSession 決定，元件不自己找。未結束的
 * 場次籤**停用**（滑鼠與鍵盤一致：點不到、方向鍵也跳過）並在籤上標開始時間。
 * 切籤**不改網址** —— 一站一個網址（ADR-0002）。
 */
export const SessionTabs = ({ weekend, timeZone, renderPanel }: SessionTabsProps): JSX.Element => {
  const tabs = TAB_ORDER.flatMap((kind) => weekend.sessions.filter((s) => s.kind === kind));
  const [selected, setSelected] = useState<SessionKind>(weekend.latestFinishedSession ?? tabs[0]?.kind ?? 'race');
  const baseId = useId();
  const current = tabs.find((t) => t.kind === selected) ?? tabs[0];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const enabled = tabs.filter((t) => t.status === 'finished');
    if (enabled.length === 0) return;
    const index = enabled.findIndex((t) => t.kind === selected);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = enabled[(index + step + enabled.length) % enabled.length];
    if (!next) return;
    event.preventDefault();
    setSelected(next.kind);
    document.getElementById(`${baseId}-tab-${next.kind}`)?.focus();
  };

  if (!current) return <></>;

  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist" aria-label="場次" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const isSelected = tab.kind === current.kind;
          const disabled = tab.status !== 'finished';
          return (
            <button
              key={tab.kind}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.kind}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel`}
              disabled={disabled}
              tabIndex={isSelected ? 0 : -1}
              className={`tabs__tab ${disabled ? 'tabs__tab--pending' : ''}`}
              onClick={() => setSelected(tab.kind)}
            >
              {SESSION_SHORT_LABEL[tab.kind]}
              {disabled && (
                <span className="tabs__when">
                  {formatSessionDay(tab.startsAt, timeZone)} {formatSessionClock(tab.startsAt, timeZone)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="tabs__panel" role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-tab-${current.kind}`}>
        {current.status === 'finished' ? (
          renderPanel(current)
        ) : (
          <p className="hero__note tabs__pending">
            {current.status === 'live'
              ? `${SESSION_SHORT_LABEL[current.kind]}進行中，結果將於結束後更新。`
              : `${SESSION_SHORT_LABEL[current.kind]}尚未舉行，${formatSessionDay(current.startsAt, timeZone)} ${formatSessionClock(current.startsAt, timeZone)}`}
          </p>
        )}
      </div>
    </div>
  );
};
