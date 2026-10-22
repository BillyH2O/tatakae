import { splitIntervalsByLocalDay } from '../../time/splitByDay';
import {
  canDiscard,
  deadline,
  endedAtForFocusedSec,
  focusedSecOf,
  focusIntervals,
  pausedMs,
  reconcile,
  resolveFinish,
  timerView,
  type TimerSession,
} from '../machine';

const MIN = 60_000;
const START = new Date(2026, 9, 22, 9, 0, 0).getTime();

const countdown = (plannedMin: number, overrides: Partial<TimerSession> = {}): TimerSession => ({
  mode: 'countdown',
  plannedSec: plannedMin * 60,
  startedAt: START,
  lastSeenAt: START,
  status: 'running',
  ...overrides,
});

const stopwatch = (overrides: Partial<TimerSession> = {}): TimerSession => ({
  mode: 'stopwatch',
  plannedSec: null,
  startedAt: START,
  lastSeenAt: START,
  status: 'running',
  ...overrides,
});

describe('pausedMs', () => {
  it('sums closed pauses and counts an open pause until `upTo`', () => {
    const pauses = [
      { startedAt: START + 5 * MIN, endedAt: START + 8 * MIN },
      { startedAt: START + 10 * MIN, endedAt: null },
    ];
    expect(pausedMs(pauses, START + 12 * MIN)).toBe(5 * MIN);
    expect(pausedMs(pauses, START + 6 * MIN)).toBe(MIN);
    expect(pausedMs([], START)).toBe(0);
  });
});

describe('focusIntervals', () => {
  it('removes pauses and keeps the rest', () => {
    const intervals = focusIntervals(stopwatch(), [{ startedAt: START + 10 * MIN, endedAt: START + 13 * MIN }], START + 20 * MIN);
    expect(intervals).toEqual([
      { start: START, end: START + 10 * MIN },
      { start: START + 13 * MIN, end: START + 20 * MIN },
    ]);
    expect(focusedSecOf(intervals)).toBe(17 * 60);
  });

  it('treats an open pause as non-focus up to now', () => {
    const intervals = focusIntervals(stopwatch(), [{ startedAt: START + 10 * MIN, endedAt: null }], START + 20 * MIN);
    expect(focusedSecOf(intervals)).toBe(10 * 60);
  });

  it('truncates a countdown at its planned duration', () => {
    const intervals = focusIntervals(countdown(25), [], START + 40 * MIN);
    expect(focusedSecOf(intervals)).toBe(25 * 60);
    expect(intervals[intervals.length - 1]?.end).toBe(START + 25 * MIN);
  });

  it('does not truncate a stopwatch', () => {
    expect(focusedSecOf(focusIntervals(stopwatch(), [], START + 90 * MIN))).toBe(90 * 60);
  });

  it('is empty before the start', () => {
    expect(focusIntervals(stopwatch(), [], START - 1)).toEqual([]);
  });
});

describe('deadline', () => {
  it('is start + planned + closed pauses; null for a stopwatch', () => {
    expect(deadline(countdown(25), [])).toBe(START + 25 * MIN);
    const pauses = [
      { startedAt: START + 5 * MIN, endedAt: START + 8 * MIN },
      { startedAt: START + 10 * MIN, endedAt: START + 12 * MIN },
    ];
    expect(deadline(countdown(25), pauses)).toBe(START + 30 * MIN);
    expect(deadline(stopwatch(), [])).toBeNull();
  });
});

describe('reconcile', () => {
  it('auto-completes a countdown at its deadline, never at now', () => {
    const action = reconcile(countdown(25), [], START + 40 * MIN);
    expect(action).toEqual({ type: 'autoComplete', endedAt: START + 25 * MIN });
  });

  it('accounts for pauses when computing the deadline', () => {
    const pauses = [{ startedAt: START + 5 * MIN, endedAt: START + 8 * MIN }];
    expect(reconcile(countdown(25), pauses, START + 27 * MIN)).toEqual({ type: 'none' });
    expect(reconcile(countdown(25), pauses, START + 28 * MIN)).toEqual({
      type: 'autoComplete',
      endedAt: START + 28 * MIN,
    });
  });

  it('leaves a running countdown before its deadline alone', () => {
    expect(reconcile(countdown(25), [], START + 10 * MIN)).toEqual({ type: 'none' });
  });

  it('never acts on a paused session', () => {
    expect(reconcile(countdown(25, { status: 'paused' }), [{ startedAt: START + MIN, endedAt: null }], START + 600 * MIN)).toEqual({
      type: 'none',
    });
  });

  it('asks for confirmation of a stopwatch after a long gap or an implausible length', () => {
    const gap = reconcile(stopwatch({ lastSeenAt: START + 5 * MIN }), [], START + 6 * 60 * MIN);
    expect(gap).toMatchObject({ type: 'confirmStopwatch', lastSeenAt: START + 5 * MIN });

    const long = reconcile(stopwatch({ lastSeenAt: START + 250 * MIN }), [], START + 251 * MIN);
    expect(long).toMatchObject({ type: 'confirmStopwatch', elapsedSec: 251 * 60 });
  });

  it('does not ask while the stopwatch is fresh', () => {
    expect(reconcile(stopwatch({ lastSeenAt: START + 59 * MIN }), [], START + 60 * MIN)).toEqual({ type: 'none' });
  });

  it('falls back to the start when no heartbeat was ever written', () => {
    expect(reconcile(stopwatch({ lastSeenAt: null }), [], START + 11 * MIN)).toMatchObject({
      type: 'confirmStopwatch',
      lastSeenAt: START,
    });
  });
});

describe('resolveFinish', () => {
  it('completes a countdown that reached its plan, even if the app was closed for longer', () => {
    const outcome = resolveFinish(countdown(25), [], START + 40 * MIN);
    expect(outcome).toMatchObject({ status: 'completed', focusedSec: 1500, endedAt: START + 40 * MIN });
  });

  it('keeps 25 min of focus after a 3 min pause (ends at +28 min)', () => {
    const pauses = [{ startedAt: START + 10 * MIN, endedAt: START + 13 * MIN }];
    const outcome = resolveFinish(countdown(25), pauses, START + 28 * MIN);
    expect(outcome).toMatchObject({ status: 'completed', focusedSec: 1500 });
  });

  it('marks a countdown stopped early and keeps the exact seconds', () => {
    const outcome = resolveFinish(countdown(25), [], START + 12 * MIN + 40_000);
    expect(outcome).toMatchObject({ status: 'stopped', focusedSec: 760 });
  });

  it('completes a stopwatch whatever its length', () => {
    expect(resolveFinish(stopwatch(), [], START + 7 * MIN)).toMatchObject({ status: 'completed', focusedSec: 420 });
  });

  it('closes an open pause at the end instant', () => {
    const pauses = [{ startedAt: START + 10 * MIN, endedAt: null }];
    expect(resolveFinish(stopwatch(), pauses, START + 30 * MIN)).toMatchObject({ focusedSec: 600 });
  });

  it('discards a session below the counted minimum', () => {
    expect(resolveFinish(stopwatch(), [], START + 59_000)).toEqual({
      status: 'discarded',
      endedAt: START + 59_000,
      focusedSec: 0,
      intervals: [],
    });
    expect(resolveFinish(stopwatch(), [], START + 60_000).status).toBe('completed');
  });

  it('never ends before the start (clock moved backwards)', () => {
    const outcome = resolveFinish(stopwatch(), [], START - 5 * MIN);
    expect(outcome.endedAt).toBe(START);
    expect(outcome.status).toBe('discarded');
  });

  it('keeps focus bounded by the plan even when the clock jumped forward', () => {
    expect(resolveFinish(countdown(25), [], START + 10_000 * MIN).focusedSec).toBe(1500);
  });

  it('splits across midnight: 23:50 → 00:15 gives 10 min and 15 min', () => {
    const start = new Date(2026, 9, 22, 23, 50, 0).getTime();
    const session = { mode: 'countdown' as const, plannedSec: 25 * 60, startedAt: start };
    const outcome = resolveFinish(session, [], start + 25 * MIN);
    expect(splitIntervalsByLocalDay(outcome.intervals)).toEqual([
      { localDate: '2026-10-22', focusedSec: 600 },
      { localDate: '2026-10-23', focusedSec: 900 },
    ]);
  });

  it('segments always sum to focusedSec', () => {
    const pauses = [{ startedAt: START + 10 * MIN + 500, endedAt: START + 13 * MIN + 250 }];
    const outcome = resolveFinish(stopwatch(), pauses, START + 20 * MIN + 999);
    const total = splitIntervalsByLocalDay(outcome.intervals).reduce((sum, day) => sum + day.focusedSec, 0);
    expect(total).toBe(outcome.focusedSec);
  });
});

describe('canDiscard', () => {
  it('is only allowed below one counted minute', () => {
    expect(canDiscard(0)).toBe(true);
    expect(canDiscard(59)).toBe(true);
    expect(canDiscard(60)).toBe(false);
  });
});

describe('endedAtForFocusedSec', () => {
  it('finds the instant a given focus was reached, skipping pauses', () => {
    const pauses = [{ startedAt: START + 10 * MIN, endedAt: START + 20 * MIN }];
    expect(endedAtForFocusedSec(stopwatch(), pauses, 15 * 60, START + 60 * MIN)).toBe(START + 25 * MIN);
    expect(endedAtForFocusedSec(stopwatch(), [], 30 * 60, START + 60 * MIN)).toBe(START + 30 * MIN);
  });

  it('is bounded by now when the target is larger than the elapsed focus', () => {
    expect(endedAtForFocusedSec(stopwatch(), [], 10_000, START + 60 * MIN)).toBe(START + 60 * MIN);
  });
});

describe('timerView', () => {
  it('shows the countdown remainder rounded up and its progress', () => {
    const view = timerView(countdown(25), [], START + 10 * MIN + 500);
    expect(view.focusedSec).toBe(600);
    expect(view.remainingSec).toBe(15 * 60); // 14:59.5 left, rounded up
    expect(view.progress).toBeCloseTo(600.5 / 1500, 5);
  });

  it('freezes while paused and caps at the planned time', () => {
    const pauses = [{ startedAt: START + 5 * MIN, endedAt: null }];
    expect(timerView(countdown(25), pauses, START + 100 * MIN).focusedSec).toBe(300);
    const done = timerView(countdown(25), [], START + 100 * MIN);
    expect(done.remainingSec).toBe(0);
    expect(done.progress).toBe(1);
  });

  it('has no remainder in stopwatch mode', () => {
    expect(timerView(stopwatch(), [], START + 90_000)).toEqual({ focusedSec: 90, remainingSec: null, progress: null });
  });
});
