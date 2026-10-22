import type { EpochMs, IsoWeekday, LocalDate } from '../types';

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_MINUTE = 60_000;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function format(y: number, m: number, d: number): LocalDate {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}` as LocalDate;
}

export function parseLocalDate(date: LocalDate): { y: number; m: number; d: number } {
  const match = LOCAL_DATE_RE.exec(date);
  if (!match) throw new Error(`Invalid LocalDate: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Validates a `YYYY-MM-DD` string (real calendar day) and brands it. */
export function asLocalDate(value: string): LocalDate {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) throw new Error(`Invalid LocalDate: ${value}`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    throw new Error(`Invalid LocalDate: ${value}`);
  }
  return value as LocalDate;
}

/** Local calendar day of an instant (uses the device time zone). */
export function toLocalDate(ms: EpochMs): LocalDate {
  const date = new Date(ms);
  return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Instant of local midnight at the start of `date` (23 h / 25 h days are handled by the JS engine). */
export function startOfLocalDay(date: LocalDate): EpochMs {
  const { y, m, d } = parseLocalDate(date);
  return new Date(y, m - 1, d).getTime();
}

/** Instant of the next local midnight after `date`. Never computed as `+ 86_400_000`. */
export function startOfNextLocalDay(date: LocalDate): EpochMs {
  return startOfLocalDay(addDays(date, 1));
}

/** Milliseconds from `now` until the next local midnight (always > 0). */
export function msUntilNextLocalMidnight(now: EpochMs): number {
  return startOfNextLocalDay(toLocalDate(now)) - now;
}

/** Calendar arithmetic, independent of the time zone and of DST. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const { y, m, d } = parseLocalDate(date);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return format(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** Number of calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

export function isoWeekday(date: LocalDate): IsoWeekday {
  const { y, m, d } = parseLocalDate(date);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return (jsDay === 0 ? 7 : jsDay) as IsoWeekday;
}

/** Monday of the ISO week containing `date`. */
export function weekStart(date: LocalDate): LocalDate {
  return addDays(date, 1 - isoWeekday(date));
}

/** The seven days (Monday → Sunday) of the week containing `date`. */
export function weekDays(date: LocalDate): LocalDate[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function firstDayOfMonth(date: LocalDate): LocalDate {
  const { y, m } = parseLocalDate(date);
  return format(y, m, 1);
}

export function lastDayOfMonth(date: LocalDate): LocalDate {
  const { y, m } = parseLocalDate(date);
  return format(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
}

export function monthRange(date: LocalDate): { from: LocalDate; to: LocalDate } {
  return { from: firstDayOfMonth(date), to: lastDayOfMonth(date) };
}

export function monthDays(date: LocalDate): LocalDate[] {
  const { from, to } = monthRange(date);
  return Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDays(from, i));
}

/** Lexicographic comparison is chronological for `YYYY-MM-DD`. */
export function compareLocalDate(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isFuture(date: LocalDate, today: LocalDate): boolean {
  return date > today;
}

export function minutesToMs(minutes: number): number {
  return minutes * MS_PER_MINUTE;
}

/** Local wall-clock instant of a calendar day (DST-safe: uses the local calendar, not 24 h steps). */
export function localInstant(date: LocalDate, hour: number, minute: number): number {
  const { y, m, d } = parseLocalDate(date);
  return new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
}
