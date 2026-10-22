import { PRODUCT } from '../config/product';
import { type ActiveBreak, APP_STATE_KEYS } from '../config/appStateKeys';
import {
  closeOpenPause,
  completeOccurrence,
  completeTask,
  finalizeActiveSession,
  getActiveSession,
  getHabit,
  getOccurrence,
  getRating,
  getSession,
  getTask,
  insertActiveSession,
  insertDaySegments,
  insertPause,
  insertXpOnce,
  listPauses,
  markPaused,
  markRunning,
  touchLastSeen,
  upsertRating,
  xpForSession,
} from '../db/repositories';
import { isUniqueConstraintError } from '../db/errors';
import { appStateRepo } from '../db/repositories/keyValue';
import type { SqlDb } from '../db/SqlDb';
import { deadline, endedAtForFocusedSec, reconcile, resolveFinish } from '../domain/timer/machine';
import { splitIntervalsByLocalDay } from '../domain/time/splitByDay';
import { toLocalDate } from '../domain/time/localDate';
import type { Session, SessionMode, StopReason } from '../domain/types';
import { xpForFocusedSec } from '../domain/xp';
import type { Clock } from './clock';
import { dataEvents } from './dataEvents';
import type { IdGenerator } from './ids';
import { syncTimerNotifications } from './notificationService';
import { clearPriorityMissionIfInvalid } from './questService';

export interface StartSessionInput {
  mode: SessionMode;
  /** Required (and > 0) for a countdown; ignored for a stopwatch. */
  plannedSec: number | null;
  categoryId: string | null;
  taskId: string | null;
  habitOccurrenceId: string | null;
}

export type StartSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; reason: 'already_active'; activeSessionId: string };

/** Starts a session; refuses (without side effects) when another one is running or paused. */
export async function startSession(
  db: SqlDb,
  clock: Clock,
  newId: IdGenerator,
  input: StartSessionInput,
): Promise<StartSessionResult> {
  if (input.mode === 'countdown' && (input.plannedSec === null || input.plannedSec <= 0)) {
    throw new Error('A countdown needs a positive planned duration');
  }
  if (input.taskId && input.habitOccurrenceId) throw new Error('A session targets a task or a habit, not both');

  const id = newId();
  const now = clock.now();
  try {
    const result = await db.transaction(async (tx): Promise<StartSessionResult> => {
      const active = await getActiveSession(tx);
      if (active) return { ok: false, reason: 'already_active', activeSessionId: active.id };
      await insertActiveSession(
        tx,
        {
          id,
          mode: input.mode,
          plannedSec: input.mode === 'countdown' ? input.plannedSec : null,
          categoryId: input.categoryId,
          taskId: input.taskId,
          habitOccurrenceId: input.habitOccurrenceId,
          // Blocking is not available in this version: never requested.
          blockingRequested: false,
        },
        now,
      );
      await appStateRepo.remove(tx, APP_STATE_KEYS.pendingSummarySessionId);
      await appStateRepo.remove(tx, APP_STATE_KEYS.activeBreak);
      return { ok: true, sessionId: id };
    });
    if (result.ok) {
      dataEvents.emit('sessions');
      await syncTimerNotifications(db, clock);
    }
    return result;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const active = await getActiveSession(db);
    if (!active) throw error;
    return { ok: false, reason: 'already_active', activeSessionId: active.id };
  }
}

/** Idempotent: pausing a session that is not running changes nothing. */
export async function pauseSession(db: SqlDb, clock: Clock, newId: IdGenerator, sessionId: string): Promise<void> {
  const now = clock.now();
  await db.transaction(async (tx) => {
    if ((await markPaused(tx, sessionId, now)) === 1) await insertPause(tx, newId(), sessionId, now);
  });
  dataEvents.emit('sessions');
  await syncTimerNotifications(db, clock);
}

/** Idempotent: resuming a session that is not paused changes nothing. */
export async function resumeSession(db: SqlDb, clock: Clock, sessionId: string): Promise<void> {
  const now = clock.now();
  await db.transaction(async (tx) => {
    if ((await markRunning(tx, sessionId, now)) === 1) await closeOpenPause(tx, sessionId, now);
  });
  dataEvents.emit('sessions');
  await syncTimerNotifications(db, clock);
}

/** Heartbeat written while the app is in the foreground and when it goes to the background. */
export async function heartbeat(db: SqlDb, clock: Clock): Promise<void> {
  const active = await getActiveSession(db);
  if (active) await touchLastSeen(db, active.id, clock.now());
}

export interface FinishOptions {
  /** Explicit end instant (defaults to now). */
  endAt?: number;
  /** End the session where its cumulative focus reached this many seconds. */
  focusedSec?: number;
  reason?: StopReason | null;
  note?: string | null;
  /** Abandon the session: only allowed while the focus is below `minCountedSec`. */
  discard?: boolean;
}

export interface FinishResult {
  session: Session;
  /** False when the session had already been finalized (nothing was written, no reward). */
  finalizedNow: boolean;
}

/**
 * Atomic, idempotent finalization (ARCHITECTURE.md §5.3). Two concurrent calls produce a single
 * finalization and a single XP row; a failure half-way rolls everything back.
 */
export async function finishSession(
  db: SqlDb,
  clock: Clock,
  newId: IdGenerator,
  sessionId: string,
  options: FinishOptions = {},
): Promise<FinishResult> {
  const now = clock.now();
  const result = await db.transaction(async (tx): Promise<FinishResult> => {
    const session = await getSession(tx, sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status !== 'running' && session.status !== 'paused') {
      return { session, finalizedNow: false };
    }

    const pauses = await listPauses(tx, sessionId);
    let requestedEndAt = options.endAt ?? now;
    if (options.focusedSec !== undefined) {
      requestedEndAt = endedAtForFocusedSec(session, pauses, options.focusedSec, now);
    }
    // A countdown never ends after its deadline, even if the app was closed for longer.
    const end = session.status === 'running' ? deadline(session, pauses) : null;
    if (end !== null) requestedEndAt = Math.min(requestedEndAt, end);

    const outcome = resolveFinish(session, pauses, requestedEndAt);
    if (options.discard && outcome.status !== 'discarded') {
      throw new Error('A session of one minute or more cannot be discarded');
    }

    await closeOpenPause(tx, sessionId, outcome.endedAt);
    const changed = await finalizeActiveSession(
      tx,
      sessionId,
      {
        status: outcome.status,
        endedAt: outcome.endedAt,
        focusedSec: outcome.focusedSec,
        stopReason: outcome.status === 'stopped' ? (options.reason ?? null) : null,
        stopNote: outcome.status === 'stopped' ? (options.note ?? null) : null,
      },
      now,
    );
    if (changed !== 1) throw new Error('Session was not active');

    if (outcome.status !== 'discarded') {
      await insertDaySegments(tx, sessionId, splitIntervalsByLocalDay(outcome.intervals));
      const xp = xpForFocusedSec(outcome.focusedSec);
      if (xp > 0) {
        await insertXpOnce(
          tx,
          {
            id: newId(),
            sourceKey: `session:${sessionId}:r0`,
            sessionId,
            amount: xp,
            ruleVersion: PRODUCT.xp.ruleVersion,
          },
          now,
        );
      }
      await appStateRepo.set(tx, APP_STATE_KEYS.pendingSummarySessionId, sessionId, now);
    }

    const updated = await getSession(tx, sessionId);
    if (!updated) throw new Error('Session missing after finalization');
    return { session: updated, finalizedNow: true };
  });
  if (result.finalizedNow) dataEvents.emit('sessions', 'xp');
  await syncTimerNotifications(db, clock);
  return result;
}

export type ReconcileOutcome =
  | { type: 'none' }
  | { type: 'autoCompleted'; sessionId: string }
  | { type: 'confirmStopwatch'; sessionId: string; lastSeenAt: number; elapsedSec: number };

/** Applies the pure reconcile decision to the active session (launch, foreground, deadline tick). */
export async function reconcileActiveSession(
  db: SqlDb,
  clock: Clock,
  newId: IdGenerator,
): Promise<ReconcileOutcome> {
  const session = await getActiveSession(db);
  if (!session) return { type: 'none' };
  const pauses = await listPauses(db, session.id);
  const action = reconcile(session, pauses, clock.now());

  if (action.type === 'autoComplete') {
    const { finalizedNow } = await finishSession(db, clock, newId, session.id, { endAt: action.endedAt });
    return finalizedNow ? { type: 'autoCompleted', sessionId: session.id } : { type: 'none' };
  }
  if (action.type === 'confirmStopwatch') {
    return {
      type: 'confirmStopwatch',
      sessionId: session.id,
      lastSeenAt: action.lastSeenAt,
      elapsedSec: action.elapsedSec,
    };
  }
  return { type: 'none' };
}

export async function rateSession(db: SqlDb, clock: Clock, sessionId: string, rating: number): Promise<void> {
  if (!Number.isInteger(rating) || rating < 1 || rating > PRODUCT.timer.ratingMax) {
    throw new Error(`Rating must be an integer between 1 and ${PRODUCT.timer.ratingMax}`);
  }
  await upsertRating(db, sessionId, rating, clock.now());
  dataEvents.emit('sessions');
}

/** Explicit and idempotent: completing an already completed quest changes nothing. */
export async function completeQuestOfSession(db: SqlDb, clock: Clock, sessionId: string): Promise<boolean> {
  const now = clock.now();
  const session = await getSession(db, sessionId);
  if (!session) return false;
  let changed = false;
  await db.transaction(async (tx) => {
    if (session.taskId) {
      const task = await getTask(tx, session.taskId);
      if (task?.status === 'open') {
        await completeTask(tx, task.id, toLocalDate(now), now);
        changed = true;
      }
    } else if (session.habitOccurrenceId) {
      const occurrence = await getOccurrence(tx, session.habitOccurrenceId);
      if (occurrence?.status === 'pending') {
        await completeOccurrence(tx, occurrence.id, now);
        changed = true;
      }
    }
  });
  if (changed) {
    await clearPriorityMissionIfInvalid(db, clock);
    dataEvents.emit('quests');
  }
  return changed;
}

export interface QuestTarget {
  taskId: string | null;
  habitOccurrenceId: string | null;
  title: string;
  categoryId: string | null;
  /** True when the quest exists and can still be completed. */
  completable: boolean;
}

/** Resolves the task or habit occurrence a session targets (null when none, or it no longer exists). */
export async function loadQuestTarget(
  db: SqlDb,
  ref: { taskId?: string | null; habitOccurrenceId?: string | null },
): Promise<QuestTarget | null> {
  if (ref.taskId) {
    const task = await getTask(db, ref.taskId);
    if (!task) return null;
    return {
      taskId: task.id,
      habitOccurrenceId: null,
      title: task.title,
      categoryId: task.categoryId,
      completable: task.status === 'open',
    };
  }
  if (ref.habitOccurrenceId) {
    const occurrence = await getOccurrence(db, ref.habitOccurrenceId);
    const habit = occurrence ? await getHabit(db, occurrence.habitId) : null;
    if (!occurrence || !habit) return null;
    return {
      taskId: null,
      habitOccurrenceId: occurrence.id,
      title: habit.title,
      categoryId: habit.categoryId,
      completable: occurrence.status === 'pending',
    };
  }
  return null;
}

export interface SessionSummary {
  session: Session;
  xpEarned: number;
  rating: number | null;
  quest: QuestTarget | null;
}

export async function loadSessionSummary(db: SqlDb, sessionId: string): Promise<SessionSummary | null> {
  const session = await getSession(db, sessionId);
  if (!session) return null;
  return {
    session,
    xpEarned: await xpForSession(db, sessionId),
    rating: await getRating(db, sessionId),
    quest: await loadQuestTarget(db, session),
  };
}

export async function getPendingSummarySessionId(db: SqlDb): Promise<string | null> {
  return appStateRepo.get<string>(db, APP_STATE_KEYS.pendingSummarySessionId);
}

export async function dismissSummary(db: SqlDb): Promise<void> {
  await appStateRepo.remove(db, APP_STATE_KEYS.pendingSummarySessionId);
  dataEvents.emit('sessions');
}

export async function getActiveBreak(db: SqlDb): Promise<ActiveBreak | null> {
  return appStateRepo.get<ActiveBreak>(db, APP_STATE_KEYS.activeBreak);
}

/** A break is only a countdown stored in `app_state`: no session, no focus, no XP. */
export async function startBreak(db: SqlDb, clock: Clock, durationSec: number): Promise<void> {
  if (durationSec <= 0) throw new Error('A break needs a positive duration');
  await db.transaction(async (tx) => {
    if (await getActiveSession(tx)) throw new Error('Cannot start a break during a session');
    await appStateRepo.set(tx, APP_STATE_KEYS.activeBreak, { startedAt: clock.now(), durationSec }, clock.now());
    await appStateRepo.remove(tx, APP_STATE_KEYS.pendingSummarySessionId);
  });
  dataEvents.emit('sessions');
  await syncTimerNotifications(db, clock);
}

export async function endBreak(db: SqlDb, clock: Clock): Promise<void> {
  await appStateRepo.remove(db, APP_STATE_KEYS.activeBreak);
  dataEvents.emit('sessions');
  await syncTimerNotifications(db, clock);
}
