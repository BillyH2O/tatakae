import type { DayFocus, Interval, LocalDate } from '../types';
import { addDays, startOfLocalDay, toLocalDate } from './localDate';

/**
 * Splits focus intervals across the local days they touch (midnight, DST and week changes).
 * Durations are real elapsed time. Seconds are floored on the running total so that the
 * sum over all days is exactly `floor(total ms / 1000)`; zero-second days are omitted.
 */
export function splitIntervalsByLocalDay(intervals: readonly Interval[]): DayFocus[] {
  const msByDay = new Map<LocalDate, number>();

  for (const interval of intervals) {
    let cursor = interval.start;
    while (cursor < interval.end) {
      const day = toLocalDate(cursor);
      const nextMidnight = startOfLocalDay(addDays(day, 1));
      const segmentEnd = Math.min(interval.end, nextMidnight);
      msByDay.set(day, (msByDay.get(day) ?? 0) + (segmentEnd - cursor));
      cursor = segmentEnd;
    }
  }

  const days = [...msByDay.keys()].sort();
  const result: DayFocus[] = [];
  let cumulativeMs = 0;
  let emittedSec = 0;
  for (const day of days) {
    cumulativeMs += msByDay.get(day) ?? 0;
    const focusedSec = Math.floor(cumulativeMs / 1000) - emittedSec;
    emittedSec += focusedSec;
    if (focusedSec > 0) result.push({ localDate: day, focusedSec });
  }
  return result;
}
