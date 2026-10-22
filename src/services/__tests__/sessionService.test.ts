/** @jest-environment node */
import {
  createTask,
  getActiveSession,
  getSession,
  listFocusByDay,
  listPauses,
  listXpTransactions,
  totalXp,
} from '../../db/repositories';
import { appStateRepo } from '../../db/repositories/keyValue';
import { asLocalDate as d } from '../../domain/time/localDate';
import { createFakeClock, createSequentialIds } from '../../test/fakeClock';
import { createMigratedDb } from '../../test/factories';
import {
  completeQuestOfSession,
  dismissSummary,
  endBreak,
  finishSession,
  getActiveBreak,
  getPendingSummarySessionId,
  heartbeat,
  loadSessionSummary,
  pauseSession,
  rateSession,
  reconcileActiveSession,
  resumeSession,
  startBreak,
  startSession,
  type StartSessionInput,
} from '../sessionService';

const MIN = 60_000;
const START = new Date(2026, 9, 22, 9, 0, 0).getTime();

const countdown = (min: number, extra: Partial<StartSessionInput> = {}): StartSessionInput => ({
  mode: 'countdown',
  plannedSec: min * 60,
  categoryId: null,
  taskId: null,
  habitOccurrenceId: null,
  ...extra,
});
const stopwatchInput: StartSessionInput = {
  mode: 'stopwatch',
  plannedSec: null,
  categoryId: null,
  taskId: null,
  habitOccurrenceId: null,
};

async function setup(start = START) {
  const db = await createMigratedDb(start);
  const clock = createFakeClock(start);
  const newId = createSequentialIds('t');
  return { db, clock, newId };
}

async function startOk(env: Awaited<ReturnType<typeof setup>>, input: StartSessionInput) {
  const result = await startSession(env.db, env.clock, env.newId, input);
  if (!result.ok) throw new Error('start refused');
  return result.sessionId;
}

describe('startSession', () => {
  it('creates a running session in the single active slot', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    expect(await getActiveSession(env.db)).toMatchObject({ id, status: 'running', mode: 'countdown', plannedSec: 1500 });
  });

  it('refuses a second session with a pointer to the running one', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    const second = await startSession(env.db, env.clock, env.newId, stopwatchInput);
    expect(second).toEqual({ ok: false, reason: 'already_active', activeSessionId: id });
    expect(env.db.raw.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 1 });
  });

  it('refuses two simultaneous starts, keeping only one', async () => {
    const env = await setup();
    const [a, b] = await Promise.all([
      startSession(env.db, env.clock, env.newId, countdown(25)),
      startSession(env.db, env.clock, env.newId, countdown(45)),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(env.db.raw.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 1 });
  });

  it('rejects an invalid countdown and a double quest target', async () => {
    const env = await setup();
    await expect(startSession(env.db, env.clock, env.newId, countdown(0))).rejects.toThrow();
    await expect(
      startSession(env.db, env.clock, env.newId, countdown(25, { taskId: 'a', habitOccurrenceId: 'b' })),
    ).rejects.toThrow();
  });

  it('never requests distraction blocking in this version', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    expect((await getSession(env.db, id))?.blockingRequested).toBe(false);
  });
});

describe('reconcile after the app was closed', () => {
  it('completes a 25 min session left 40 min: ended at the deadline, 1500 s, exactly 25 XP', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    env.clock.set(START + 40 * MIN); // "restart" 40 min later

    expect(await reconcileActiveSession(env.db, env.clock, env.newId)).toEqual({ type: 'autoCompleted', sessionId: id });
    expect(await getSession(env.db, id)).toMatchObject({
      status: 'completed',
      endedAt: START + 25 * MIN,
      focusedSec: 1500,
    });
    expect(await getActiveSession(env.db)).toBeNull();
    expect(await totalXp(env.db)).toBe(25);
    expect(await getPendingSummarySessionId(env.db)).toBe(id);

    // Running it again changes nothing (idempotent).
    expect(await reconcileActiveSession(env.db, env.clock, env.newId)).toEqual({ type: 'none' });
    expect(await totalXp(env.db)).toBe(25);
  });

  it('does nothing before the deadline', async () => {
    const env = await setup();
    await startOk(env, countdown(25));
    env.clock.set(START + 10 * MIN);
    expect(await reconcileActiveSession(env.db, env.clock, env.newId)).toEqual({ type: 'none' });
    expect(await getActiveSession(env.db)).not.toBeNull();
  });

  it('a 3 min pause moves the end to +28 min and keeps 1500 s of focus', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    env.clock.set(START + 10 * MIN);
    await pauseSession(env.db, env.clock, env.newId, id);
    env.clock.set(START + 13 * MIN);
    await resumeSession(env.db, env.clock, id);

    env.clock.set(START + 27 * MIN);
    expect(await reconcileActiveSession(env.db, env.clock, env.newId)).toEqual({ type: 'none' });
    env.clock.set(START + 35 * MIN);
    await reconcileActiveSession(env.db, env.clock, env.newId);

    expect(await getSession(env.db, id)).toMatchObject({
      status: 'completed',
      endedAt: START + 28 * MIN,
      focusedSec: 1500,
    });
    const days = await listFocusByDay(env.db, d('2026-10-22'), d('2026-10-22'));
    expect(days).toEqual([{ localDate: '2026-10-22', focusedSec: 1500 }]); // the 3 min are in no total
  });

  it('asks before recording a stopwatch left open for 6 h with the app closed', async () => {
    const env = await setup();
    const id = await startOk(env, stopwatchInput);
    env.clock.set(START + 6 * 60 * MIN);
    const outcome = await reconcileActiveSession(env.db, env.clock, env.newId);
    expect(outcome).toEqual({ type: 'confirmStopwatch', sessionId: id, lastSeenAt: START, elapsedSec: 6 * 3600 });
    // Nothing recorded yet.
    expect(await getActiveSession(env.db)).not.toBeNull();
    expect(await totalXp(env.db)).toBe(0);
    expect(await listFocusByDay(env.db, d('2026-10-22'), d('2026-10-23'))).toEqual([]);

    // The user keeps the time until the last activity.
    await finishSession(env.db, env.clock, env.newId, id, { endAt: START + 3 * 60 * MIN });
    expect(await getSession(env.db, id)).toMatchObject({ status: 'completed', focusedSec: 3 * 3600 });
  });

  it('lets the user enter a duration for an overlong stopwatch', async () => {
    const env = await setup();
    const id = await startOk(env, stopwatchInput);
    env.clock.set(START + 6 * 60 * MIN);
    await finishSession(env.db, env.clock, env.newId, id, { focusedSec: 45 * 60 });
    expect(await getSession(env.db, id)).toMatchObject({ status: 'completed', focusedSec: 2700, endedAt: START + 45 * MIN });
    expect(await totalXp(env.db)).toBe(45);
  });

  it('a heartbeat keeps a stopwatch from asking for confirmation', async () => {
    const env = await setup();
    await startOk(env, stopwatchInput);
    env.clock.set(START + 59 * MIN);
    await heartbeat(env.db, env.clock);
    env.clock.set(START + 60 * MIN);
    expect(await reconcileActiveSession(env.db, env.clock, env.newId)).toEqual({ type: 'none' });
  });
});

describe('finishSession', () => {
  it('stops early at 12 min 40 s: 760 s kept, 12 XP, reason stored', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    env.clock.set(START + 12 * MIN + 40_000);
    const result = await finishSession(env.db, env.clock, env.newId, id, { reason: 'tired' });
    expect(result.finalizedNow).toBe(true);
    expect(await getSession(env.db, id)).toMatchObject({ status: 'stopped', focusedSec: 760, stopReason: 'tired' });
    expect(await totalXp(env.db)).toBe(12);
  });

  it('ends a countdown finished by the user after its deadline at the deadline', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    env.clock.set(START + 40 * MIN);
    await finishSession(env.db, env.clock, env.newId, id);
    expect(await getSession(env.db, id)).toMatchObject({ status: 'completed', endedAt: START + 25 * MIN, focusedSec: 1500 });
  });

  it('a double finalization (two simultaneous calls) writes a single result and a single XP row', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    env.clock.set(START + 25 * MIN);
    const results = await Promise.all([
      finishSession(env.db, env.clock, env.newId, id),
      finishSession(env.db, env.clock, env.newId, id),
    ]);
    expect(results.filter((r) => r.finalizedNow)).toHaveLength(1);
    expect(await listXpTransactions(env.db, id)).toHaveLength(1);
    expect(await totalXp(env.db)).toBe(25);
    expect(env.db.raw.prepare('SELECT COUNT(*) AS n FROM session_day_segments').get()).toEqual({ n: 1 });
  });

  it('closes an open pause when finishing a paused session', async () => {
    const env = await setup();
    const id = await startOk(env, stopwatchInput);
    env.clock.set(START + 10 * MIN);
    await pauseSession(env.db, env.clock, env.newId, id);
    env.clock.set(START + 30 * MIN);
    await finishSession(env.db, env.clock, env.newId, id);
    expect(await getSession(env.db, id)).toMatchObject({ status: 'completed', focusedSec: 600, endedAt: START + 30 * MIN });
    expect((await listPauses(env.db, id))[0]?.endedAt).toBe(START + 30 * MIN);
  });

  it('splits a 23:50 → 00:15 session into 10 min and 15 min', async () => {
    const start = new Date(2026, 9, 22, 23, 50, 0).getTime();
    const env = await setup(start);
    const id = await startOk(env, countdown(25));
    env.clock.set(start + 25 * MIN);
    await finishSession(env.db, env.clock, env.newId, id);
    expect(await listFocusByDay(env.db, d('2026-10-22'), d('2026-10-23'))).toEqual([
      { localDate: '2026-10-22', focusedSec: 600 },
      { localDate: '2026-10-23', focusedSec: 900 },
    ]);
    // XP is per session, not per day segment.
    expect(await totalXp(env.db)).toBe(25);
  });

  it('rolls back everything when a write fails half-way', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    // A pre-existing segment makes the segment insert fail after the session update.
    env.db.raw.pragma('foreign_keys = OFF');
    env.db.raw
      .prepare("INSERT INTO session_day_segments (session_id, local_date, focused_sec) VALUES (?, '2026-10-22', 5)")
      .run(id);
    env.db.raw.pragma('foreign_keys = ON');

    env.clock.set(START + 25 * MIN);
    await expect(finishSession(env.db, env.clock, env.newId, id)).rejects.toThrow();

    expect(await getSession(env.db, id)).toMatchObject({ status: 'running', endedAt: null, finalizedAt: null });
    expect(await totalXp(env.db)).toBe(0);
    expect(await getPendingSummarySessionId(env.db)).toBeNull();
  });

  it('a restart (fresh clock, same database) still finalizes exactly once', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    const restartedClock = createFakeClock(START + 90 * MIN);
    await reconcileActiveSession(env.db, restartedClock, createSequentialIds('r'));
    await finishSession(env.db, restartedClock, createSequentialIds('r2'), id);
    expect(await totalXp(env.db)).toBe(25);
  });
});

describe('discard', () => {
  it('abandons a session under one minute: nothing is counted', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    env.clock.set(START + 30_000);
    await finishSession(env.db, env.clock, env.newId, id, { discard: true });
    expect(await getSession(env.db, id)).toMatchObject({ status: 'discarded', focusedSec: 0 });
    expect(await totalXp(env.db)).toBe(0);
    expect(await listFocusByDay(env.db, d('2026-10-22'), d('2026-10-22'))).toEqual([]);
    expect(await getPendingSummarySessionId(env.db)).toBeNull();
    expect(await getActiveSession(env.db)).toBeNull();
  });

  it('refuses to discard a session of one minute or more', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    env.clock.set(START + 2 * MIN);
    await expect(finishSession(env.db, env.clock, env.newId, id, { discard: true })).rejects.toThrow();
    expect(await getActiveSession(env.db)).not.toBeNull();
  });

  it('finishing under one minute counts nothing either', async () => {
    const env = await setup();
    const id = await startOk(env, stopwatchInput);
    env.clock.set(START + 59_000);
    await finishSession(env.db, env.clock, env.newId, id);
    expect((await getSession(env.db, id))?.status).toBe('discarded');
  });
});

describe('pause and resume', () => {
  it('are idempotent and keep at most one open pause', async () => {
    const env = await setup();
    const id = await startOk(env, stopwatchInput);
    env.clock.set(START + MIN);
    await pauseSession(env.db, env.clock, env.newId, id);
    await pauseSession(env.db, env.clock, env.newId, id);
    expect(await listPauses(env.db, id)).toHaveLength(1);
    env.clock.set(START + 2 * MIN);
    await resumeSession(env.db, env.clock, id);
    await resumeSession(env.db, env.clock, id);
    expect((await listPauses(env.db, id))[0]).toMatchObject({ startedAt: START + MIN, endedAt: START + 2 * MIN });
    expect((await getSession(env.db, id))?.status).toBe('running');
  });
});

describe('summary', () => {
  it('reports XP, optional rating and the linked quest; completing the quest is explicit and idempotent', async () => {
    const env = await setup();
    await createTask(env.db, { id: 'task-1', title: 'Write report', categoryId: null, dueDate: null, priority: 1 }, START);
    const id = await startOk(env, countdown(25, { taskId: 'task-1' }));
    env.clock.set(START + 25 * MIN);
    await finishSession(env.db, env.clock, env.newId, id);

    let summary = await loadSessionSummary(env.db, id);
    expect(summary).toMatchObject({ xpEarned: 25, rating: null, quest: { title: 'Write report', completable: true } });

    await rateSession(env.db, env.clock, id, 4);
    expect((await loadSessionSummary(env.db, id))?.rating).toBe(4);
    await expect(rateSession(env.db, env.clock, id, 0)).rejects.toThrow();
    await expect(rateSession(env.db, env.clock, id, 6)).rejects.toThrow();

    expect(await completeQuestOfSession(env.db, env.clock, id)).toBe(true);
    expect(await completeQuestOfSession(env.db, env.clock, id)).toBe(false);
    summary = await loadSessionSummary(env.db, id);
    expect(summary?.quest?.completable).toBe(false);
    expect(await totalXp(env.db)).toBe(25); // completing a quest never grants XP
  });

  it('keeps the summary pending across restarts until it is dismissed', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));
    env.clock.set(START + 25 * MIN);
    await finishSession(env.db, env.clock, env.newId, id);
    expect(await getPendingSummarySessionId(env.db)).toBe(id);
    await dismissSummary(env.db);
    expect(await getPendingSummarySessionId(env.db)).toBeNull();
  });
});

describe('break', () => {
  it('is stored as a countdown only: no session, no focus, no XP', async () => {
    const env = await setup();
    await startBreak(env.db, env.clock, 300);
    expect(await getActiveBreak(env.db)).toEqual({ startedAt: START, durationSec: 300 });
    expect(env.db.raw.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 });
    expect(await totalXp(env.db)).toBe(0);
    await endBreak(env.db);
    expect(await getActiveBreak(env.db)).toBeNull();
  });

  it('cannot start during a session, and a new session clears a leftover break', async () => {
    const env = await setup();
    await startBreak(env.db, env.clock, 300);
    await startOk(env, countdown(25));
    expect(await getActiveBreak(env.db)).toBeNull();
    await expect(startBreak(env.db, env.clock, 300)).rejects.toThrow();
  });

  it('a break leaves no trace in app_state once ended', async () => {
    const env = await setup();
    await startBreak(env.db, env.clock, 300);
    await endBreak(env.db);
    expect(await appStateRepo.get(env.db, 'activeBreak')).toBeNull();
  });
});
