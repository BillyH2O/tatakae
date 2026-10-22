import type { DailyGoalVersion, LocalDate, WeeklyGoalVersion } from '../../domain/types';
import type { SqlDb } from '../SqlDb';
import {
  type DailyGoalRow,
  type WeeklyGoalRow,
  toDailyGoal,
  toWeeklyGoal,
} from '../rows';

export async function listDailyGoalVersions(db: SqlDb): Promise<DailyGoalVersion[]> {
  const rows = await db.all<DailyGoalRow>(
    'SELECT weekday, effective_from, goal_min, is_rest FROM daily_goal_versions ORDER BY weekday, effective_from',
  );
  return rows.map(toDailyGoal);
}

export async function listWeeklyGoalVersions(db: SqlDb): Promise<WeeklyGoalVersion[]> {
  const rows = await db.all<WeeklyGoalRow>(
    'SELECT effective_from, goal_min FROM weekly_goal_versions ORDER BY effective_from',
  );
  return rows.map(toWeeklyGoal);
}

/**
 * Appends a goal version effective from `effectiveFrom`. Same weekday + same date replaces the
 * version of that exact date (UPSERT); earlier versions are never touched.
 */
export async function upsertDailyGoal(
  db: SqlDb,
  input: { id: string; weekday: number; effectiveFrom: LocalDate; goalMin: number | null; isRest: boolean },
  now: number,
): Promise<void> {
  await db.run(
    `INSERT INTO daily_goal_versions (id, weekday, effective_from, goal_min, is_rest, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (weekday, effective_from)
     DO UPDATE SET goal_min = excluded.goal_min, is_rest = excluded.is_rest`,
    [
      input.id,
      input.weekday,
      input.effectiveFrom,
      input.isRest ? null : input.goalMin,
      input.isRest ? 1 : 0,
      now,
    ],
  );
}

export async function upsertWeeklyGoal(
  db: SqlDb,
  input: { effectiveFrom: LocalDate; goalMin: number | null },
  now: number,
): Promise<void> {
  await db.run(
    `INSERT INTO weekly_goal_versions (effective_from, goal_min, created_at) VALUES (?, ?, ?)
     ON CONFLICT (effective_from) DO UPDATE SET goal_min = excluded.goal_min`,
    [input.effectiveFrom, input.goalMin, now],
  );
}
