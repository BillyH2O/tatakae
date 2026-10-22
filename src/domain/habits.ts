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
