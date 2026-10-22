import { PRODUCT } from '../config/product';
import { parseReminderTime } from './notifications';
import { localInstant } from './time/localDate';
import { splitIntervalsByLocalDay } from './time/splitByDay';
import type { DayFocus, LocalDate } from './types';
import { xpForFocusedSec } from './xp';

const MS_PER_SEC = 1000;
const SEC_PER_MIN = 60;

export type EditError = 'invalid_time' | 'too_short' | 'too_long' | 'in_future' | 'not_a_number';

export interface ManualEntryInput {
  date: LocalDate;
  /** Local start time "HH:MM". */
  time: string;
  durationMin: number;
}

export type ManualEntryPlan =
  | { ok: true; startedAt: number; endedAt: number; focusedSec: number; segments: DayFocus[] }
  | { ok: false; error: EditError };

function checkDuration(durationSec: number): EditError | null {
  if (!Number.isFinite(durationSec)) return 'not_a_number';
  if (durationSec < PRODUCT.timer.minCountedSec) return 'too_short';
  if (durationSec > PRODUCT.stats.manualMaxMin * SEC_PER_MIN) return 'too_long';
  return null;
}

/** A manual entry is one contiguous interval; it can neither be empty, absurdly long nor in the future. */
export function planManualEntry(input: ManualEntryInput, nowMs: number): ManualEntryPlan {
  const time = parseReminderTime(input.time);
  if (!time) return { ok: false, error: 'invalid_time' };
  const durationSec = Math.round(input.durationMin * SEC_PER_MIN);
  const durationError = checkDuration(durationSec);
  if (durationError) return { ok: false, error: durationError };

  const startedAt = localInstant(input.date, time.hour, time.minute);
  const endedAt = startedAt + durationSec * MS_PER_SEC;
  if (endedAt > nowMs) return { ok: false, error: 'in_future' };
  return {
    ok: true,
    startedAt,
    endedAt,
    focusedSec: durationSec,
    segments: splitIntervalsByLocalDay([{ start: startedAt, end: endedAt }]),
  };
}

export type CorrectionPlan =
  | { ok: true; endedAt: number; focusedSec: number; segments: DayFocus[] }
  | { ok: false; error: EditError };

/**
 * Corrected duration: one contiguous interval from the original start (pauses are not modelled any
 * more), so the day segments are recomputed from it. Cannot end in the future.
 */
export function planCorrection(startedAt: number, newFocusedSec: number, nowMs: number): CorrectionPlan {
  const error = checkDuration(newFocusedSec);
  if (error) return { ok: false, error };
  const endedAt = startedAt + newFocusedSec * MS_PER_SEC;
  if (endedAt > nowMs) return { ok: false, error: 'in_future' };
  return {
    ok: true,
    endedAt,
    focusedSec: newFocusedSec,
    segments: splitIntervalsByLocalDay([{ start: startedAt, end: endedAt }]),
  };
}

/**
 * XP adjustment of a correction: the session ends with exactly `xpForFocusedSec(new)` in total
 * (`Σ xp(session) = xpForFocusedSec(focused_sec)`), so the delta is what is missing (or in excess).
 */
export function xpDelta(xpAlreadyEarned: number, newFocusedSec: number): number {
  return xpForFocusedSec(newFocusedSec) - xpAlreadyEarned;
}
