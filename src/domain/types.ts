/**
 * 本專案的**內部**資料形狀（Snapshot）與畫面模型（View Model）。
 *
 * 第三方 API 的原始形狀一律不外流到這一層以外 —— normalise 負責把
 * Jolpica / OpenF1 的巢狀回應轉成這裡的形狀，其餘程式只認得這裡的型別。
 * 詞彙定義見 CONTEXT.md。
 */

/** 一個 Race Weekend 底下的單一 Session。 */
export type SessionKind =
  | 'fp1'
  | 'fp2'
  | 'fp3'
  | 'sprintQualifying'
  | 'sprint'
  | 'qualifying'
  | 'race';

/**
 * 各 Session 的慣例時長（分鐘）。
 *
 * Jolpica **只提供開始時間、不提供結束時間**，因此「某個場次是否正在進行中」
 * 只能由開始時間加上慣例時長推導。這些數字來自 F1 賽制規章的正常情況，
 * 不考慮紅旗中斷或延賽 —— 它們的用途僅是驅動「進行中 / 已結束」的顯示，
 * 不是精準的賽事計時。
 */
export const SESSION_DURATION_MINUTES: Record<SessionKind, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprintQualifying: 45,
  sprint: 30,
  qualifying: 60,
  race: 120,
};

/** Session 在畫面上的顯示順序權重，同時間時用來穩定排序。 */
const SESSION_ORDER: Record<SessionKind, number> = {
  fp1: 0,
  fp2: 1,
  sprintQualifying: 2,
  fp3: 3,
  sprint: 4,
  qualifying: 5,
  race: 6,
};

export const sessionOrder = (kind: SessionKind): number => SESSION_ORDER[kind];

export interface Session {
  kind: SessionKind;
  /** ISO 8601 UTC 字串。 */
  startsAt: string;
}

export interface Circuit {
  id: string;
  name: string;
  locality: string;
  country: string;
  lat: number;
  long: number;
}

export interface RaceWeekend {
  round: number;
  /** 正式名稱（英文），例如 "Spanish Grand Prix"。中文譯名由對照表另行提供。 */
  name: string;
  circuit: Circuit;
  /** 依時間排序；Sprint Weekend 的組成由資料決定，不可假設固定五個場次。 */
  sessions: Session[];
}

export interface DriverRef {
  id: string;
  /** 三字母縮寫（如 "ANT"）。API 未提供時為 null —— 不由姓氏捏造。 */
  code: string | null;
  permanentNumber: string | null;
  givenName: string;
  familyName: string;
  nationality: string;
}

export interface TeamRef {
  id: string;
  name: string;
  nationality: string;
}

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driver: DriverRef;
  teams: TeamRef[];
}

export interface TeamStanding {
  position: number;
  points: number;
  wins: number;
  team: TeamRef;
}

/**
 * 一次抓取的完整結果，以 season 為索引鍵。
 * 見 docs/adr/0001 與 docs/adr/0004。
 */
export interface Snapshot {
  season: string;
  /** 已完成的 Round 數；球季尚未開始時為 null。 */
  completedRound: number | null;
  /** 抓取當下的時間（ISO 8601 UTC）。 */
  fetchedAt: string;
  weekends: RaceWeekend[];
  driverStandings: DriverStanding[];
  teamStandings: TeamStanding[];
}

// ---------------------------------------------------------------------------
// View Model
// ---------------------------------------------------------------------------

export type SessionStatus = 'finished' | 'live' | 'upcoming';

export interface SessionView {
  kind: SessionKind;
  startsAt: string;
  /** 由 startsAt 加上慣例時長推導，非 API 提供。 */
  endsAt: string;
  status: SessionStatus;
}

export interface WeekendView {
  round: number;
  name: string;
  circuit: Circuit;
  sessions: SessionView[];
}

export interface NextSession {
  weekend: WeekendView;
  session: SessionView;
  /** 距離開始的毫秒數；若該場次正在進行中則為 0。 */
  msUntilStart: number;
}

export interface ViewModel {
  season: string;
  fetchedAt: string;
  /**
   * 目前聚焦的 Race Weekend —— 含有 Next Session 的那一個。
   * 球季已結束（Off-season）時為 null。
   */
  focusWeekend: WeekendView | null;
  /** Off-season 時為 null。 */
  nextSession: NextSession | null;
  /** 本季所有 Session 都已結束。 */
  isOffSeason: boolean;
}
