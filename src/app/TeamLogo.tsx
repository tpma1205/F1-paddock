import { useState, type JSX } from 'react';
import type { TeamView } from '../domain/types.ts';
import { readableOn } from './colour.ts';
import { teamLogoUrl, wordmarkText } from './teamAssets.ts';

/**
 * logo 容器是**白色銘牌**：F1 官方 logo 是白底不透明的 96×96 圖，放進深色
 * 容器會變成突兀的白方塊或直接看不見。白色銘牌是深色介面呈現車隊 logo 的
 * 標準做法，車隊識別交給色條與光暈。字標的顏色也以此背景調整可讀性。
 */
const CONTAINER_BACKGROUND = '#ffffff';

interface TeamLogoProps {
  team: Pick<TeamView, 'id' | 'name' | 'colour'>;
  size?: 'card' | 'hero';
}

/**
 * 車隊 logo —— **所有 logo 渲染進同一個固定尺寸容器**，並施以統一的代表色處理。
 *
 * 正規化進同一個框是刻意的：Audi 與 Cadillac 沒有官方 logo、用的是字標，
 * 若容器尺寸不一，那兩張字標會讀成破圖；容器一致，它們就讀成設計節奏
 * （見 docs/adr/0003 的 Consequences）。
 *
 * 熱連結隨時可能失效，onError 降級為字標是常態機制而非例外處理。
 */
export const TeamLogo = ({ team, size = 'card' }: TeamLogoProps): JSX.Element => {
  const [failed, setFailed] = useState(false);
  const url = teamLogoUrl(team.id);
  const accent = team.colour ?? '#8b8b96';

  const style = { '--team-colour': accent } as React.CSSProperties;

  return (
    <span className={`team-logo team-logo--${size}`} style={style}>
      {url && !failed ? (
        <img
          src={url}
          alt={`${team.name} logo`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="team-logo__wordmark"
          style={{ color: readableOn(accent, CONTAINER_BACKGROUND) }}
        >
          {wordmarkText(team.name)}
        </span>
      )}
    </span>
  );
};
