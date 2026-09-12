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

/** 單一場正賽中一位車手的 Result。 */
export interface RaceResult {
  /** 分類序號，退賽者亦有（依完成圈數排）。 */
  position: number;
  /** "1"…"22"，或 "R"（退賽）、"W"（退出）等。 */
  positionText: string;
  /** positionText 為數字 —— 有正式名次。 */
  classified: boolean;
  points: number;
  /** Jolpica 的狀態字串："Finished"、"Lapped"、"Retired"、"Did not start"… */
  status: string;
  laps: number;
  grid: number;
  /** 冠軍為總時間，其餘為與冠軍的差距；未完賽者為 null。 */
  time: string | null;
  fastestLap: boolean;
  /**
   * 只存 ID，不內嵌 DriverRef／TeamRef —— 286 筆賽果各帶一份完整車手物件
   * （含 150 字元的照片網址）會讓快照膨脹近一倍。畫面所需的參照由
   * View Model 解析（見 ResultView）。
   */
  driverId: string;
  teamId: string;
}

/** 排位賽單一車手的成績。 */
export interface QualifyingResult {
  position: number;
  driverId: string;
  teamId: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface RaceWeekend {
  round: number;
  /** 正式名稱（英文），例如 "Spanish Grand Prix"。中文譯名由對照表另行提供。 */
  name: string;
  circuit: Circuit;
  /** 依時間排序；Sprint Weekend 的組成由資料決定，不可假設固定五個場次。 */
  sessions: Session[];
  /** 正賽 Result，依分類序號排序；尚未舉行或資料未提供時為 null。 */
  results: RaceResult[] | null;
  /** 衝刺賽 Result，形狀與正賽相同；非 Sprint Weekend 或尚未舉行時為 null。 */
  sprintResults: RaceResult[] | null;
  /** 排位賽成績，依名次排序；尚未舉行時為 null。 */
  qualifying: QualifyingResult[] | null;
}

export interface DriverRef {
  id: string;
  /** 三字母縮寫（如 "ANT"）。API 未提供時為 null —— 不由姓氏捏造。 */
  code: string | null;
  permanentNumber: string | null;
  givenName: string;
  familyName: string;
  nationality: string;
  /** 來自 OpenF1；缺漏時為 null，畫面降級為代表色 + 縮寫（見 docs/adr/0003）。 */
  headshotUrl: string | null;
}

export interface TeamRef {
  id: string;
  name: string;
  nationality: string;
  /** 代表色（含 # 的十六進位），來自 OpenF1；缺漏時為 null。 */
  colour: string | null;
}

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  /** 本季前三名完賽次數。抓取時缺少賽果資料則為 null（未知，而非零）。 */
  podiums: number | null;
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

/** 賽果 + 解析後的車手與車隊參照。 */
export interface ResultView extends RaceResult {
  driver: DriverRef;
  team: TeamRef;
}

export interface WeekendView {
  round: number;
  name: string;
  circuit: Circuit;
  sessions: SessionView[];
  /** 正賽的狀態 —— 賽程表用它區分已完賽／進行中／未來。 */
  raceStatus: SessionStatus;
  results: ResultView[] | null;
  /** 前三名（有正式名次者），供賽程表直接顯示。 */
  podium: ResultView[];
}

export interface NextSession {
  weekend: WeekendView;
  session: SessionView;
  /** 距離開始的毫秒數；若該場次正在進行中則為 0。 */
  msUntilStart: number;
}

export interface DriverSummary {
  driver: DriverRef;
  position: number;
  points: number;
  wins: number;
}

/** 車手的畫面模型：積分榜資料 + 當前車隊。 */
export interface DriverView {
  driver: DriverRef;
  /** 當前車隊（賽季中轉隊者取最後一支）；資料異常時為 null。 */
  team: TeamRef | null;
  position: number;
  points: number;
  wins: number;
  podiums: number | null;
}

/** 賽道的畫面模型：賽道 + 本季在此舉辦的 Race Weekend。 */
export interface CircuitView {
  circuit: Circuit;
  /** 本季在此賽道舉辦的站次（同一賽道可能不只一站），依 Round 排序。 */
  weekends: Array<{ round: number; name: string }>;
}

/** 車隊的畫面模型：積分榜資料 + 該隊車手，依名次排序。 */
export interface TeamView {
  id: string;
  name: string;
  nationality: string;
  colour: string | null;
  position: number;
  points: number;
  wins: number;
  /** 以車手**當前**車隊歸類（賽季中轉隊者只出現在最後一隊），依名次排序。 */
  drivers: DriverSummary[];
}

/** 一位車手在積分走勢圖上的一條線。 */
export interface ProgressionSeries {
  driver: DriverRef;
  team: TeamRef | null;
  /** 與 PointsProgression.rounds 對齊；正賽 + 衝刺賽累積。 */
  cumulative: number[];
  /** 同隊第幾位（0 或 1）—— 同隊顏色相同，以此區分實線／虛線。 */
  teammateIndex: number;
}

export interface PointsProgression {
  /** 已完成的 Round，依序。 */
  rounds: number[];
  /** 依最終積分排序。 */
  series: ProgressionSeries[];
}

/** 隊友對決中一方的戰績。 */
export interface BattleSide {
  driver: DriverRef;
  points: number;
  wins: number;
  podiums: number | null;
  /** 兩人都參與的排位賽中，排在隊友前面的次數。 */
  qualifyingAhead: number;
  /** 兩人都完賽（有正式名次）的正賽中，排在隊友前面的次數。 */
  raceAhead: number;
}

export interface TeammateBattle {
  teamId: string;
  a: BattleSide;
  b: BattleSide;
  /** 兩人都參與的排位賽場數。 */
  qualifyingContests: number;
  /** 兩人都有正式名次的正賽場數。 */
  raceContests: number;
}

export interface Highlight {
  driver: DriverRef;
  team: TeamRef | null;
  count: number;
}

/** 本季數據亮點；資料不足以判斷時為 null。 */
export interface SeasonHighlights {
  mostWins: Highlight | null;
  mostPoles: Highlight | null;
  mostPodiums: Highlight | null;
  mostRetirements: Highlight | null;
}

export interface ViewModel {
  season: string;
  fetchedAt: string;
  /** 本季全部 Race Weekend，依 Round 排序。 */
  weekends: WeekendView[];
  progression: PointsProgression;
  /** 每支車隊一筆；只有一位車手的車隊不列。 */
  battles: TeammateBattle[];
  highlights: SeasonHighlights;
  /** 依名次排序。 */
  teams: TeamView[];
  /** 依名次排序。 */
  drivers: DriverView[];
  /** 依本季首次出現的 Round 排序。 */
  circuits: CircuitView[];
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
