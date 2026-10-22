import { resolveDayGoal, resolveWeekGoal } from './goals';
import { focusIntervals, type PauseSpan, type TimerSession } from './timer/machine';
import { addDays, weekStart } from './time/localDate';
import { splitIntervalsByLocalDay } from './time/splitByDay';
import type { Category, DailyGoalVersion, DayFocus, EpochMs, LocalDate, WeeklyGoalVersion } from './types';

export type FocusByDay = ReadonlyMap<LocalDate, number>;

/** The running/paused session, whose focus so far is added live to the stored totals. */
export interface LiveSession {
  session: Pick<TimerSession, 'mode' | 'plannedSec' | 'startedAt'>;
  pauses: readonly PauseSpan[];
  now: EpochMs;
}

/**
 * Single source of focus totals (header, Home, Stats). Built from the per-day segments stored in
 * the database (finalized sessions only) plus the live focus of the active session, split by local
 * day exactly like a finalized session would be.
 */
export function buildFocusByDay(rows: readonly DayFocus[], live: LiveSession | null = null): FocusByDay {
  const map = new Map<LocalDate, number>();
  for (const row of rows) map.set(row.localDate, (map.get(row.localDate) ?? 0) + row.focusedSec);
  if (live) {
    const intervals = focusIntervals(live.session, live.pauses, live.now);
    for (const day of splitIntervalsByLocalDay(intervals)) {
      map.set(day.localDate, (map.get(day.localDate) ?? 0) + day.focusedSec);
    }
  }
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

/** Live focus (seconds) of the running session that falls on local day `date`. */
export function liveFocusOnDate(live: LiveSession, date: LocalDate): number {
  const days = splitIntervalsByLocalDay(focusIntervals(live.session, live.pauses, live.now));
  return days.find((day) => day.localDate === date)?.focusedSec ?? 0;
}

export interface CategoryFocus {
  /** Null = "Uncategorized". */
  categoryId: string | null;
  focusedSec: number;
}

export interface CategoryBar {
  /** Null = "Uncategorized"; an archived category is still shown (`category.archivedAt`). */
  category: Category | null;
  focusedSec: number;
  /** 0..1 on a common scale: the biggest category of the day is 1 (not a goal). */
  ratio: number;
}

/**
 * Focus per category for one day, biggest first, drawn on a common scale. Rows of the same
 * category are summed; the live session is added to its own category by the caller.
 */
export function categoryBars(rows: readonly CategoryFocus[], categories: readonly Category[]): CategoryBar[] {
  const totals = new Map<string | null, number>();
  // A category id missing from categories (stale read during a data change) counts as uncategorized,
  // so the result never holds two uncategorized entries or an entry without a category.
  const known = new Set(categories.map((category) => category.id));
  for (const row of rows) {
    const id = row.categoryId !== null && known.has(row.categoryId) ? row.categoryId : null;
    if (row.focusedSec > 0) totals.set(id, (totals.get(id) ?? 0) + row.focusedSec);
  }
  const max = Math.max(0, ...totals.values());
  const sortOrder = (id: string | null) =>
    id === null ? Number.MAX_SAFE_INTEGER : (categories.find((category) => category.id === id)?.sortOrder ?? 0);
  return [...totals.entries()]
    .map(([id, focusedSec]) => ({
      id,
      category: id === null ? null : (categories.find((category) => category.id === id) ?? null),
      focusedSec,
      ratio: max > 0 ? focusedSec / max : 0,
    }))
    .sort((a, b) => b.focusedSec - a.focusedSec || sortOrder(a.id) - sortOrder(b.id))
    .map(({ category, focusedSec, ratio }) => ({ category, focusedSec, ratio }));
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
