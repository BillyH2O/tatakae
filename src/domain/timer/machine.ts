import { PRODUCT } from '../../config/product';
import type { EpochMs, Interval, Session, SessionPause } from '../types';

/** The fields of a session the timer machine needs. */
export type TimerSession = Pick<Session, 'mode' | 'plannedSec' | 'startedAt' | 'lastSeenAt' | 'status'>;
export type PauseSpan = Pick<SessionPause, 'startedAt' | 'endedAt'>;

interface TimerConfig {
  minCountedSec: number;
  stopwatchGapConfirmMin: number;
  stopwatchMaxPlausibleMin: number;
}

const MS_PER_SEC = 1000;
const MS_PER_MIN = 60_000;

/** Total paused time up to `upTo`; an open pause counts until `upTo`. */
export function pausedMs(pauses: readonly PauseSpan[], upTo: EpochMs): number {
  let total = 0;
  for (const pause of pauses) {
    const start = Math.min(pause.startedAt, upTo);
    const end = Math.min(pause.endedAt ?? upTo, upTo);
    total += Math.max(0, end - start);
  }
  return total;
}

/**
 * Focused intervals of a session up to `upTo`: `[startedAt, upTo]` minus the pauses, truncated so
 * that a countdown never counts more than `plannedSec`. Single basis for display, finalization
 * and the per-day segments.
 */
export function focusIntervals(
  session: Pick<TimerSession, 'mode' | 'plannedSec' | 'startedAt'>,
  pauses: readonly PauseSpan[],
  upTo: EpochMs,
): Interval[] {
  if (upTo <= session.startedAt) return [];

  const sorted = [...pauses].sort((a, b) => a.startedAt - b.startedAt);
  const raw: Interval[] = [];
  let cursor = session.startedAt;
  for (const pause of sorted) {
    const pauseStart = Math.max(pause.startedAt, session.startedAt);
    const pauseEnd = Math.min(pause.endedAt ?? upTo, upTo);
    if (pauseEnd <= pauseStart) continue;
    if (pauseStart > cursor) raw.push({ start: cursor, end: Math.min(pauseStart, upTo) });
    cursor = Math.max(cursor, pauseEnd);
  }
  if (cursor < upTo) raw.push({ start: cursor, end: upTo });

  if (session.mode !== 'countdown' || session.plannedSec === null) return raw;

  let budget = session.plannedSec * MS_PER_SEC;
  const truncated: Interval[] = [];
  for (const interval of raw) {
    if (budget <= 0) break;
    const length = interval.end - interval.start;
    if (length <= budget) {
      truncated.push(interval);
      budget -= length;
    } else {
      truncated.push({ start: interval.start, end: interval.start + budget });
      budget = 0;
    }
  }
  return truncated;
}

export function intervalsMs(intervals: readonly Interval[]): number {
  return intervals.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
}

/** Whole focused seconds. Equals the sum of the per-day segments built from the same intervals. */
export function focusedSecOf(intervals: readonly Interval[]): number {
  return Math.floor(intervalsMs(intervals) / MS_PER_SEC);
}

/** Instant at which a running countdown ends: start + planned + closed pauses. Null for a stopwatch. */
export function deadline(
  session: Pick<TimerSession, 'mode' | 'plannedSec' | 'startedAt'>,
  pauses: readonly PauseSpan[],
): EpochMs | null {
  if (session.mode !== 'countdown' || session.plannedSec === null) return null;
  const closedMs = pauses.reduce(
    (sum, pause) => (pause.endedAt === null ? sum : sum + Math.max(0, pause.endedAt - pause.startedAt)),
    0,
  );
  return session.startedAt + session.plannedSec * MS_PER_SEC + closedMs;
}

export type ReconcileAction =
  | { type: 'none' }
  | { type: 'autoComplete'; endedAt: EpochMs }
  | { type: 'confirmStopwatch'; lastSeenAt: EpochMs; elapsedSec: number };

/** Decides what, if anything, must happen to an active session (launch, foreground, tick). */
export function reconcile(
  session: TimerSession,
  pauses: readonly PauseSpan[],
  now: EpochMs,
  config: TimerConfig = PRODUCT.timer,
): ReconcileAction {
  if (session.status !== 'running') return { type: 'none' };

  if (session.mode === 'countdown') {
    const end = deadline(session, pauses);
    return end !== null && now >= end ? { type: 'autoComplete', endedAt: end } : { type: 'none' };
  }

  const lastSeenAt = session.lastSeenAt ?? session.startedAt;
  const elapsedSec = focusedSecOf(focusIntervals(session, pauses, now));
  const gapTooLong = now - lastSeenAt > config.stopwatchGapConfirmMin * MS_PER_MIN;
  const tooLong = elapsedSec * MS_PER_SEC > config.stopwatchMaxPlausibleMin * MS_PER_MIN;
  return gapTooLong || tooLong
    ? { type: 'confirmStopwatch', lastSeenAt, elapsedSec }
    : { type: 'none' };
}

export type FinalStatus = 'completed' | 'stopped' | 'discarded';

export interface FinishOutcome {
  status: FinalStatus;
  endedAt: EpochMs;
  /** Counted focus; 0 when discarded. */
  focusedSec: number;
  /** Intervals to split by local day; empty when discarded. */
  intervals: Interval[];
}

/**
 * Resolves how a session ends at `requestedEndAt`.
 * - focus below `minCountedSec` → discarded (nothing is counted);
 * - stopwatch → completed; countdown → completed once the planned time is reached, else stopped.
 */
export function resolveFinish(
  session: Pick<TimerSession, 'mode' | 'plannedSec' | 'startedAt'>,
  pauses: readonly PauseSpan[],
  requestedEndAt: EpochMs,
  config: Pick<TimerConfig, 'minCountedSec'> = PRODUCT.timer,
): FinishOutcome {
  const endedAt = Math.max(requestedEndAt, session.startedAt);
  const intervals = focusIntervals(session, pauses, endedAt);
  const focusedSec = focusedSecOf(intervals);

  if (focusedSec < config.minCountedSec) {
    return { status: 'discarded', endedAt, focusedSec: 0, intervals: [] };
  }
  const reachedPlan =
    session.mode !== 'countdown' ||
    session.plannedSec === null ||
    intervalsMs(intervals) >= session.plannedSec * MS_PER_SEC;
  return { status: reachedPlan ? 'completed' : 'stopped', endedAt, focusedSec, intervals };
}

/** A session can only be abandoned while its focus is below the counted minimum. */
export function canDiscard(focusedSec: number, config: Pick<TimerConfig, 'minCountedSec'> = PRODUCT.timer): boolean {
  return focusedSec < config.minCountedSec;
}

/** Instant at which the cumulative focus reached `targetSec` (used to trim an overlong stopwatch). */
export function endedAtForFocusedSec(
  session: Pick<TimerSession, 'mode' | 'plannedSec' | 'startedAt'>,
  pauses: readonly PauseSpan[],
  targetSec: number,
  now: EpochMs,
): EpochMs {
  let remaining = Math.max(0, targetSec) * MS_PER_SEC;
  for (const interval of focusIntervals(session, pauses, now)) {
    const length = interval.end - interval.start;
    if (remaining <= length) return interval.start + remaining;
    remaining -= length;
  }
  return now;
}

export interface TimerView {
  focusedSec: number;
  /** Countdown only: whole seconds left (rounded up so "0:00" means finished). */
  remainingSec: number | null;
  /** Countdown only: 0..1 share of the planned time. */
  progress: number | null;
}

export function timerView(
  session: Pick<TimerSession, 'mode' | 'plannedSec' | 'startedAt'>,
  pauses: readonly PauseSpan[],
  now: EpochMs,
): TimerView {
  const intervals = focusIntervals(session, pauses, now);
  const focusedMs = intervalsMs(intervals);
  const focusedSec = Math.floor(focusedMs / MS_PER_SEC);
  if (session.mode !== 'countdown' || session.plannedSec === null) {
    return { focusedSec, remainingSec: null, progress: null };
  }
  const plannedMs = session.plannedSec * MS_PER_SEC;
  return {
    focusedSec,
    remainingSec: Math.ceil(Math.max(0, plannedMs - focusedMs) / MS_PER_SEC),
    progress: Math.min(1, focusedMs / plannedMs),
  };
}
