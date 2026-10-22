import { addDays, isoWeekday, weekDays, weekStart } from './time/localDate';
import type { Habit, HabitOccurrence, IsoWeekday, LocalDate } from './types';

export function maskHasWeekday(mask: number, weekday: IsoWeekday): boolean {
  return (mask & (1 << (weekday - 1))) !== 0;
}

export function maskFromWeekdays(weekdays: readonly IsoWeekday[]): number {
  return weekdays.reduce((mask, weekday) => mask | (1 << (weekday - 1)), 0);
}

export function weekdaysFromMask(mask: number): IsoWeekday[] {
  return ([1, 2, 3, 4, 5, 6, 7] as const).filter((weekday) => maskHasWeekday(mask, weekday));
}

export interface HabitSchedule {
  weekdaysMask: number;
  startLocalDate: LocalDate;
  archivedLocalDate: LocalDate | null;
  status: Habit['status'];
}

/** Local dates between `from` and `to` (inclusive) where this habit is planned. */
export function occurrenceDatesToEnsure(
  habit: HabitSchedule,
  from: LocalDate,
  to: LocalDate,
): LocalDate[] {
  if (habit.status === 'archived' && habit.archivedLocalDate && from > habit.archivedLocalDate) {
    return [];
  }
  const start = from > habit.startLocalDate ? from : habit.startLocalDate;
  const end =
    habit.archivedLocalDate && habit.archivedLocalDate < to ? habit.archivedLocalDate : to;
  if (start > end) return [];

  const dates: LocalDate[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    if (maskHasWeekday(habit.weekdaysMask, isoWeekday(day))) dates.push(day);
  }
  return dates;
}

export type HabitCalendarState = 'done' | 'missed' | 'planned' | 'rest' | 'absent';

export function habitCalendarState(
  date: LocalDate,
  habit: HabitSchedule,
  occurrence: Pick<HabitOccurrence, 'status'> | null,
  today: LocalDate,
): HabitCalendarState {
  if (date < habit.startLocalDate) return 'absent';
  if (habit.archivedLocalDate && date > habit.archivedLocalDate) return 'absent';
  if (!maskHasWeekday(habit.weekdaysMask, isoWeekday(date))) return 'rest';
  if (occurrence?.status === 'done') return 'done';
  if (date < today) return 'missed';
  return 'planned';
}

/** Done / planned habit days in the ISO week containing `today`, counting only days ≤ today. */
export function habitWeekProgress(
  habit: HabitSchedule,
  occurrences: readonly Pick<HabitOccurrence, 'localDate' | 'status'>[],
  today: LocalDate,
): { done: number; planned: number } {
  const week = weekDays(weekStart(today));
  let planned = 0;
  let done = 0;
  for (const day of week) {
    if (day > today) continue;
    const occurrence = occurrences.find((o) => o.localDate === day) ?? null;
    const state = habitCalendarState(day, habit, occurrence, today);
    if (state === 'rest' || state === 'absent') continue;
    planned += 1;
    if (state === 'done') done += 1;
  }
  return { done, planned };
}
/** Cell of a habit regularity grid. `pending` = planned today, not done yet; `upcoming` = planned later. */
export type HabitHeatState = 'done' | 'missed' | 'pending' | 'upcoming' | 'rest' | 'absent';

export interface HabitHeatCell {
  date: LocalDate;
  state: HabitHeatState;
}

/**
 * GitHub-style regularity grid of one habit: `weeks` columns of seven cells (Monday → Sunday),
 * oldest week first, the current week last. Same rules as the habit calendar.
 */
export function habitRegularityGrid(
  habit: HabitSchedule,
  occurrences: readonly Pick<HabitOccurrence, 'localDate' | 'status'>[],
  today: LocalDate,
  weeks: number,
): HabitHeatCell[][] {
  const byDate = new Map(occurrences.map((occurrence) => [occurrence.localDate, occurrence]));
  const from = addDays(weekStart(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(from, week * 7 + day);
      const state = habitCalendarState(date, habit, byDate.get(date) ?? null, today);
      const heat: HabitHeatState =
        state === 'planned' ? (date === today ? 'pending' : 'upcoming') : state;
      return { date, state: heat };
    }),
  );
}

export interface HabitRegularity {
  /** Planned days up to today that are done / counted (today counts only once done). */
  done: number;
  planned: number;
  /** Whole percent of planned days done, or null before any planned day. */
  ratePercent: number | null;
  /** Consecutive planned days done, ending today (or yesterday while today is still pending). */
  currentStreak: number;
  bestStreak: number;
}

/** Totals over a regularity grid: only past days and today if done count (an unfinished today is not a miss). */
export function habitRegularity(grid: readonly (readonly HabitHeatCell[])[]): HabitRegularity {
  let done = 0;
  let planned = 0;
  let run = 0;
  let best = 0;
  for (const cell of grid.flat()) {
    if (cell.state === 'done') {
      done += 1;
      planned += 1;
      run += 1;
      best = Math.max(best, run);
    } else if (cell.state === 'missed') {
      planned += 1;
      run = 0;
    }
    // pending / upcoming / rest / absent never break or extend a streak.
  }
  return {
    done,
    planned,
    ratePercent: planned > 0 ? Math.floor((done / planned) * 100) : null,
    currentStreak: run,
    bestStreak: best,
  };
}
