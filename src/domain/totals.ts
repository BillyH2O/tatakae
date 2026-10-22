import { resolveDayGoal, resolveWeekGoal } from './goals';
import { addDays, weekStart } from './time/localDate';
import type { DailyGoalVersion, DayFocus, LocalDate, WeeklyGoalVersion } from './types';

export type FocusByDay = ReadonlyMap<LocalDate, number>;

/**
 * Single source of focus totals (header, Home, Stats). Built from the per-day segments stored in
 * the database; the live active session is added in a later step.
 */
export function buildFocusByDay(rows: readonly DayFocus[]): FocusByDay {
  const map = new Map<LocalDate, number>();
  for (const row of rows) map.set(row.localDate, (map.get(row.localDate) ?? 0) + row.focusedSec);
  return map;
}

/** Σ focus seconds over the inclusive range `[from, to]`. */
export function sumFocusRange(byDay: FocusByDay, from: LocalDate, to: LocalDate): number {
  let total = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) total += byDay.get(day) ?? 0;
  return total;
}

/** Week (Monday → Sunday) containing `date`. */
export function weekRange(date: LocalDate): { from: LocalDate; to: LocalDate } {
  const from = weekStart(date);
  return { from, to: addDays(from, 6) };
}

export interface FocusVsGoal {
  focusSec: number;
  /** Minutes, or null when there is no goal (rest day, no goal, no profile yet). */
  goalMin: number | null;
}

export interface HeaderTotals {
  today: FocusVsGoal;
  week: FocusVsGoal;
}

export interface HeaderTotalsInput {
  today: LocalDate;
  byDay: FocusByDay;
  /** First day of use; null before onboarding, in which case no goal applies. */
  profileStart: LocalDate | null;
  dailyGoals: readonly DailyGoalVersion[];
  weeklyGoals: readonly WeeklyGoalVersion[];
}

/** Header always reflects the real current day and week, never a selected date. */
export function headerTotals(input: HeaderTotalsInput): HeaderTotals {
  const { today, byDay, profileStart, dailyGoals, weeklyGoals } = input;
  const week = weekRange(today);
  const dayGoal = profileStart ? resolveDayGoal(today, dailyGoals, profileStart) : { kind: 'none' as const };
  return {
    today: {
      focusSec: byDay.get(today) ?? 0,
      goalMin: dayGoal.kind === 'goal' ? dayGoal.minutes : null,
    },
    week: {
      focusSec: sumFocusRange(byDay, week.from, week.to),
      goalMin: profileStart ? resolveWeekGoal(week.from, weeklyGoals) : null,
    },
  };
}

/** 0..1 share of the goal reached; null when there is no goal (no bar is shown). */
export function goalProgress({ focusSec, goalMin }: FocusVsGoal): number | null {
  if (goalMin === null || goalMin <= 0) return null;
  return Math.min(1, focusSec / 60 / goalMin);
}
