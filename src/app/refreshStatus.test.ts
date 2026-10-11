import { describe, expect, it } from 'vitest';
import { COOLDOWN_MS, cooldownRemainingMs, describeOutcome } from './refreshStatus.ts';
import type { RefreshOutcome } from '../data/liveRefresh.ts';
import type { Snapshot } from '../domain/types.ts';

const snapshot = {} as Snapshot;
const outcome = (over: Partial<RefreshOutcome>): RefreshOutcome => ({
  snapshot,
  timed: {},
  changed: false,
  nothingPending: false,
  requests: 3,
  notes: [],
  ...over,
});
const text = (o: RefreshOutcome): string => describeOutcome(o).text;

describe('cooldownRemainingMs —— 60 秒冷卻', () => {
  it('按下後 60 秒內剩餘時間遞減，到點歸零', () => {
    expect(COOLDOWN_MS).toBe(60_000);
    expect(cooldownRemainingMs(1_000, 1_000)).toBe(60_000);
    expect(cooldownRemainingMs(1_000, 31_000)).toBe(30_000);
    expect(cooldownRemainingMs(1_000, 61_000)).toBe(0);
    expect(cooldownRemainingMs(1_000, 99_000)).toBe(0);
  });

  it('從沒按過（null）沒有冷卻', () => {
    expect(cooldownRemainingMs(null, 5)).toBe(0);
  });
});

describe('describeOutcome —— 每種情況有明確且不同的訊息', () => {
  it('場次進行中（401）', () => {
    expect(text(outcome({ notes: [{ kind: 'live-session' }] }))).toBe('場次進行中，結束後才能取得結果');
  });

  it('Jolpica 與 OpenF1 都還沒有資料', () => {
    expect(text(outcome({ notes: [{ kind: 'no-data-yet', sessions: ['race'] }] }))).toContain('還沒有資料');
  });

  it('網路或 HTTP 錯誤：保留原資料並顯示錯誤', () => {
    const message = text(outcome({ notes: [{ kind: 'error', detail: 'Failed to fetch' }] }));
    expect(message).toContain('更新失敗');
    expect(message).toContain('保留');
  });

  it('沒有待補場次', () => {
    expect(text(outcome({ nothingPending: true, requests: 0 }))).toBe('目前沒有待補結果的場次');
  });

  it('只補到暫定結果、積分榜站次落後：兩件事都說明', () => {
    const message = text(
      outcome({ changed: true, notes: [{ kind: 'standings-stale', expected: 13, got: 12 }] }),
    );
    expect(message).toContain('已更新');
    expect(message).toContain('積分榜尚未更新');
  });

  it('成功更新', () => {
    expect(describeOutcome(outcome({ changed: true })).tone).toBe('success');
    expect(text(outcome({ changed: true }))).toContain('已更新');
  });

  it('已補到資料、另有場次回 401：顯示「已更新」並說明，不被 401 訊息蓋掉', () => {
    const message = text(outcome({ changed: true, notes: [{ kind: 'live-session' }] }));
    expect(message).toContain('已更新');
    expect(message).toContain('場次進行中');
  });

  it('401 與一般錯誤、無資料的訊息彼此不同', () => {
    const messages = [
      text(outcome({ notes: [{ kind: 'live-session' }] })),
      text(outcome({ notes: [{ kind: 'error', detail: 'x' }] })),
      text(outcome({ notes: [{ kind: 'no-data-yet', sessions: ['race'] }] })),
      text(outcome({ nothingPending: true })),
      text(outcome({ changed: true })),
    ];
    expect(new Set(messages).size).toBe(messages.length);
  });

  it('401 優先於同時出現的其他說明，不被當成一般錯誤', () => {
    const d = describeOutcome(outcome({ notes: [{ kind: 'live-session' }, { kind: 'error', detail: 'x' }] }));
    expect(d.tone).toBe('info');
  });
});
