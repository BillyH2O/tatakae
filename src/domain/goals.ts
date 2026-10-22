import { PRODUCT } from '../config/product';
import { isoWeekday } from './time/localDate';
import type { DailyGoalVersion, DayGoal, LocalDate, WeeklyGoalVersion } from './types';

/**
 * Goals are versioned: changing a goal inserts a new version effective from a date and never
 * rewrites the days before it, so past scores stay stable.
 */
export function resolveDayGoal(
  date: LocalDate,
  versions: readonly DailyGoalVersion[],
  profileStart: LocalDate,
): DayGoal {
  if (date < profileStart) return { kind: 'none' };
  const weekday = isoWeekday(date);
  let applicable: DailyGoalVersion | undefined;
  for (const version of versions) {
    if (version.weekday !== weekday || version.effectiveFrom > date) continue;
    if (!applicable || version.effectiveFrom > applicable.effectiveFrom) applicable = version;
  }
  if (!applicable) return { kind: 'none' };
  if (applicable.isRest) return { kind: 'rest' };
  if (applicable.goalMin === null) return { kind: 'none' };
  return { kind: 'goal', minutes: applicable.goalMin };
}

/** Weekly goal (minutes) in force for the week starting on `weekStartDate`, or null. */
export function resolveWeekGoal(
  weekStartDate: LocalDate,
  versions: readonly WeeklyGoalVersion[],
): number | null {
  let applicable: WeeklyGoalVersion | undefined;
  for (const version of versions) {
    if (version.effectiveFrom > weekStartDate) continue;
    if (!applicable || version.effectiveFrom > applicable.effectiveFrom) applicable = version;
  }
  return applicable?.goalMin ?? null;
}

/** Default weekly goal proposed at onboarding: the sum of the default daily goals. */
export function defaultWeeklyGoalMin(): number {
  return Object.values(PRODUCT.goals.defaultDailyMin).reduce<number>(
    (sum, value) => (typeof value === 'number' ? sum + value : sum),
    0,
  );
}
