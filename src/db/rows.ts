import type {
  Category,
  DailyGoalVersion,
  IsoWeekday,
  LocalDate,
  Profile,
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
