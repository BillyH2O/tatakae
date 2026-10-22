import { PRODUCT } from '../config/product';
import { resolveDayGoal } from './goals';
import { addDays, weekStart } from './time/localDate';
import type { DailyGoalVersion, IsoWeekday, LocalDate } from './types';

export type DailyGoalDraft =
  | { kind: 'goal'; minutes: number }
  | { kind: 'rest' }
  | { kind: 'none' };

export type DailyGoalMode = DailyGoalDraft['kind'];

/** Default daily goals proposed at onboarding (from PRODUCT). */
export function defaultDailyGoalDrafts(): Record<IsoWeekday, DailyGoalDraft> {
  const out = {} as Record<IsoWeekday, DailyGoalDraft>;
  for (const [key, value] of Object.entries(PRODUCT.goals.defaultDailyMin)) {
    const weekday = Number(key) as IsoWeekday;
    if (value === 'rest') out[weekday] = { kind: 'rest' };
    else out[weekday] = { kind: 'goal', minutes: value };
  }
  return out;
}

/** Current daily goal draft per weekday (for Settings), using versions in force today. */
export function dailyDraftsFromVersions(
  versions: readonly DailyGoalVersion[],
  profileStart: LocalDate,
  today: LocalDate,
): Record<IsoWeekday, DailyGoalDraft> {
  const out = {} as Record<IsoWeekday, DailyGoalDraft>;
  const monday = weekStart(today);
  for (const weekday of [1, 2, 3, 4, 5, 6, 7] as const) {
    const probe = resolveDayGoal(addDays(monday, weekday - 1), versions, profileStart);
    if (probe.kind === 'goal') out[weekday] = { kind: 'goal', minutes: probe.minutes };
    else if (probe.kind === 'rest') out[weekday] = { kind: 'rest' };
    else out[weekday] = { kind: 'none' };
  }
  return out;
}
