import type { JSX } from 'react';
import type { BattleSide, TeammateBattle } from '../domain/types.ts';
import { DriverPhoto } from './DriverPhoto.tsx';
import { localisedDriver } from '../data/localisation.ts';

interface TeammateBattleCardProps {
  battle: TeammateBattle;
  /** 車隊代表色。 */
  colour: string | null;
}

interface Row {
  label: string;
  a: number | null;
  b: number | null;
  /** 對戰場數（僅排位／正賽有）。 */
  contests?: number;
}

/**
 * 隊友對決：同隊兩人的正面比較。
 *
 * 每一列是一組對比條：兩邊各佔自己的比例，中間留 2px 的底色縫（指引的
 * surface gap）。兩邊顏色相同（同隊），以**左實右斜紋**區分 —— 同走勢圖
 * 的虛實線邏輯，identity 不靠顏色。
 */
export const TeammateBattleCard = ({ battle, colour }: TeammateBattleCardProps): JSX.Element => {
  const accent = colour ?? '#8b8b96';
  const style = { '--team-colour': accent } as React.CSSProperties;

  const rows: Row[] = [
    { label: '積分', a: battle.a.points, b: battle.b.points },
    { label: '勝場', a: battle.a.wins, b: battle.b.wins },
    { label: '頒獎台', a: battle.a.podiums, b: battle.b.podiums },
    { label: '排位對戰', a: battle.a.qualifyingAhead, b: battle.b.qualifyingAhead, contests: battle.qualifyingContests },
    { label: '正賽對戰', a: battle.a.raceAhead, b: battle.b.raceAhead, contests: battle.raceContests },
  ];

  return (
    <div className="battle" style={style}>
      <div className="battle__heads">
        <Head side={battle.a} colour={accent} align="start" />
        <span className="battle__vs">vs</span>
        <Head side={battle.b} colour={accent} align="end" />
      </div>

      <dl className="battle__rows">
        {rows.map((row) => (
          <BattleRow key={row.label} row={row} />
        ))}
      </dl>
    </div>
  );
};

const Head = ({ side, colour, align }: { side: BattleSide; colour: string; align: 'start' | 'end' }): JSX.Element => (
  <div className={`battle__head battle__head--${align}`}>
    <DriverPhoto driver={side.driver} colour={colour} />
    <span className="battle__name">
      <span>{side.driver.familyName}</span>
      <span className="battle__zh">{localisedDriver(side.driver.id)?.zh ?? ''}</span>
    </span>
  </div>
);

const BattleRow = ({ row }: { row: Row }): JSX.Element => {
  const a = row.a ?? 0;
  const b = row.b ?? 0;
  const total = a + b;
  // 兩邊都是 0 時各佔一半，讓條看起來是「平手」而不是空的。
  const shareA = total === 0 ? 50 : (a / total) * 100;
  const unknown = row.a === null || row.b === null;

  return (
    <div className="battle__row">
      <dt>
        {row.label}
        {row.contests !== undefined && <span className="battle__contests">{row.contests} 場</span>}
      </dt>
      <dd>
        <span className="battle__value">{unknown ? '—' : a}</span>
        <span className="battle__bar" aria-hidden="true">
          <span className="battle__fill battle__fill--a" style={{ width: `${shareA}%` }} />
          <span className="battle__fill battle__fill--b" style={{ width: `${100 - shareA}%` }} />
        </span>
        <span className="battle__value battle__value--b">{unknown ? '—' : b}</span>
      </dd>
    </div>
  );
};
