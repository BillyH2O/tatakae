/** Calendar day in the user's local time zone, formatted `YYYY-MM-DD`. */
export type LocalDate = string & { readonly __brand: 'LocalDate' };

/** Milliseconds since the Unix epoch (UTC instant). */
export type EpochMs = number;

export interface Interval {
  start: EpochMs;
  end: EpochMs;
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DayGoal =
  | { kind: 'goal'; minutes: number }
  | { kind: 'rest' }
  | { kind: 'none' };

export interface DailyGoalVersion {
  weekday: IsoWeekday;
  effectiveFrom: LocalDate;
  goalMin: number | null;
  isRest: boolean;
}

export interface WeeklyGoalVersion {
  effectiveFrom: LocalDate;
  goalMin: number | null;
}

export interface DayFocus {
  localDate: LocalDate;
  focusedSec: number;
}

export interface Profile {
  displayName: string;
  avatarUri: string | null;
  startLocalDate: LocalDate;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  archivedAt: EpochMs | null;
}

export interface XpTransaction {
  id: string;
  sourceKey: string;
  sessionId: string | null;
  amount: number;
  ruleVersion: string;
  createdAt: EpochMs;
}
