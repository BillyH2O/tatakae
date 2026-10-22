import { resolveHabitStyle } from '../domain/habitStyle';
import type {
  Category,
  DailyGoalVersion,
  Habit,
  HabitOccurrence,
  IsoWeekday,
  LocalDate,
  Profile,
  Session,
  SessionPause,
  Task,
  TaskPriority,
  WeeklyGoalVersion,
  XpTransaction,
} from '../domain/types';

export interface ProfileRow {
  id: number;
  display_name: string;
  avatar_uri: string | null;
  start_local_date: string;
  created_at: number;
  updated_at: number;
}

export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  archived_at: number | null;
}

export interface DailyGoalRow {
  weekday: number;
  effective_from: string;
  goal_min: number | null;
  is_rest: number;
}

export interface WeeklyGoalRow {
  effective_from: string;
  goal_min: number | null;
}

export interface XpRow {
  id: string;
  source_key: string;
  session_id: string | null;
  amount: number;
  rule_version: string;
  created_at: number;
}

export const toProfile = (row: ProfileRow): Profile => ({
  displayName: row.display_name,
  avatarUri: row.avatar_uri,
  startLocalDate: row.start_local_date as LocalDate,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  sortOrder: row.sort_order,
  archivedAt: row.archived_at,
});

export const toDailyGoal = (row: DailyGoalRow): DailyGoalVersion => ({
  weekday: row.weekday as IsoWeekday,
  effectiveFrom: row.effective_from as LocalDate,
  goalMin: row.goal_min,
  isRest: row.is_rest === 1,
});

export const toWeeklyGoal = (row: WeeklyGoalRow): WeeklyGoalVersion => ({
  effectiveFrom: row.effective_from as LocalDate,
  goalMin: row.goal_min,
});

export const toXpTransaction = (row: XpRow): XpTransaction => ({
  id: row.id,
  sourceKey: row.source_key,
  sessionId: row.session_id,
  amount: row.amount,
  ruleVersion: row.rule_version,
  createdAt: row.created_at,
});

export interface TaskRow {
  id: string;
  title: string;
  category_id: string | null;
  due_date: string | null;
  priority: number;
  status: string;
  completed_at: number | null;
  completed_local_date: string | null;
  created_at: number;
  updated_at: number;
}

export interface HabitRow {
  id: string;
  title: string;
  color: string;
  icon: string;
  category_id: string | null;
  weekdays_mask: number;
  reminder_time: string | null;
  status: string;
  start_local_date: string;
  archived_local_date: string | null;
  created_at: number;
  updated_at: number;
}

export interface OccurrenceRow {
  id: string;
  habit_id: string;
  local_date: string;
  status: string;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

export const toTask = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  categoryId: row.category_id,
  dueDate: row.due_date as LocalDate | null,
  priority: row.priority as TaskPriority,
  status: row.status as Task['status'],
  completedAt: row.completed_at,
  completedLocalDate: row.completed_local_date as LocalDate | null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toHabit = (row: HabitRow): Habit => ({
  id: row.id,
  title: row.title,
  ...resolveHabitStyle(row),
  categoryId: row.category_id,
  weekdaysMask: row.weekdays_mask,
  reminderTime: row.reminder_time,
  status: row.status as Habit['status'],
  startLocalDate: row.start_local_date as LocalDate,
  archivedLocalDate: row.archived_local_date as LocalDate | null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const toOccurrence = (row: OccurrenceRow): HabitOccurrence => ({
  id: row.id,
  habitId: row.habit_id,
  localDate: row.local_date as LocalDate,
  status: row.status as HabitOccurrence['status'],
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface SessionRow {
  id: string;
  source: string;
  mode: string | null;
  status: string;
  planned_sec: number | null;
  started_at: number;
  ended_at: number | null;
  last_seen_at: number | null;
  focused_sec: number | null;
  stop_reason: string | null;
  category_id: string | null;
  task_id: string | null;
  habit_occurrence_id: string | null;
  blocking_requested: number;
  finalized_at: number | null;
}

export interface PauseRow {
  id: string;
  session_id: string;
  started_at: number;
  ended_at: number | null;
}

export const toSession = (row: SessionRow): Session => ({
  id: row.id,
  source: row.source as Session['source'],
  mode: row.mode as Session['mode'],
  status: row.status as Session['status'],
  plannedSec: row.planned_sec,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  lastSeenAt: row.last_seen_at,
  focusedSec: row.focused_sec,
  stopReason: row.stop_reason as Session['stopReason'],
  categoryId: row.category_id,
  taskId: row.task_id,
  habitOccurrenceId: row.habit_occurrence_id,
  blockingRequested: row.blocking_requested === 1,
  finalizedAt: row.finalized_at,
});

export const toPause = (row: PauseRow): SessionPause => ({
  id: row.id,
  sessionId: row.session_id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
});
