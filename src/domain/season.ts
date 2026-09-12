import { SESSION_DURATION_MINUTES, type Session, type Snapshot } from './types.ts';

const MINUTE_MS = 60_000;

/**
 * Session 的結束時間 —— **由慣例時長推導，API 不提供**。
 * 見 SESSION_DURATION_MINUTES 的說明。
 */
export const endOf = (session: Session): number =>
  Date.parse(session.startsAt) + SESSION_DURATION_MINUTES[session.kind] * MINUTE_MS;

/** 該季所有場次都已結束。沒有任何場次的快照視為已結束（沒東西可等）。 */
export const seasonFinished = (snapshot: Snapshot, nowMs: number): boolean =>
  snapshot.weekends.every((w) => w.sessions.every((s) => endOf(s) <= nowMs));
