import type { JSX } from 'react';
import { formatCheckedAt } from './formatting.ts';
import type { LiveRefresh } from './useLiveRefresh.ts';

interface RefreshControlProps {
  live: LiveRefresh;
  /** 目前畫面所用的賽程季 —— 更新的對象。 */
  season: string;
  timeZone: string;
}

/**
 * 頁尾的「立即更新」：場次剛結束時不必等排程，直接補抓該場次的結果
 * （見 docs/adr/0005）。結果與錯誤都寫在按鈕旁的同一行，不使用彈窗。
 */
export const RefreshControl = ({ live, season, timeZone }: RefreshControlProps): JSX.Element => {
  const { refreshing, cooldownMs, status } = live;
  const cooling = cooldownMs > 0;
  const label = refreshing ? '更新中…' : cooling ? `立即更新（${Math.ceil(cooldownMs / 1000)} 秒後可再按）` : '立即更新';

  return (
    <span className="refresh">
      <button
        type="button"
        className="refresh__button"
        disabled={refreshing || cooling}
        onClick={() => void live.refresh(season)}
      >
        {label}
      </button>
      <span className={`refresh__status ${status ? `refresh__status--${status.tone}` : ''}`} role="status" aria-live="polite">
        {status && (
          <>
            {status.text}
            <span className="refresh__checked">（{formatCheckedAt(status.checkedAt, timeZone)} 檢查）</span>
          </>
        )}
      </span>
    </span>
  );
};
