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

export type TaskPriority = 0 | 1 | 2;
export type TaskStatus = 'open' | 'done' | 'archived';

export interface Task {
  id: string;
  title: string;
  categoryId: string | null;
  dueDate: LocalDate | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: EpochMs | null;
  completedLocalDate: LocalDate | null;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export type SessionMode = 'countdown' | 'stopwatch';
export type SessionStatus = 'running' | 'paused' | 'completed' | 'stopped' | 'discarded';
export type StopReason = 'interrupted' | 'tired' | 'quest_done' | 'other';

export interface Session {
  id: string;
  source: 'timer' | 'manual';
  mode: SessionMode | null;
  status: SessionStatus;
  plannedSec: number | null;
  startedAt: EpochMs;
  endedAt: EpochMs | null;
  lastSeenAt: EpochMs | null;
  focusedSec: number | null;
  stopReason: StopReason | null;
  categoryId: string | null;
  taskId: string | null;
  habitOccurrenceId: string | null;
  blockingRequested: boolean;
  finalizedAt: EpochMs | null;
}

export interface SessionPause {
  id: string;
  sessionId: string;
  startedAt: EpochMs;
  endedAt: EpochMs | null;
}

export type HabitStatus = 'active' | 'archived';
export type OccurrenceStatus = 'pending' | 'done';

export interface Habit {
  id: string;
  title: string;
  categoryId: string | null;
  weekdaysMask: number;
  reminderTime: string | null;
  status: HabitStatus;
  startLocalDate: LocalDate;
  archivedLocalDate: LocalDate | null;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}

export interface HabitOccurrence {
  id: string;
  habitId: string;
  localDate: LocalDate;
  status: OccurrenceStatus;
  completedAt: EpochMs | null;
  createdAt: EpochMs;
  updatedAt: EpochMs;
}
