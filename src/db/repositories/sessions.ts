import type { DayFocus, Session, SessionMode, SessionPause, StopReason } from '../../domain/types';
import type { SqlDb } from '../SqlDb';
import { type PauseRow, type SessionRow, toPause, toSession } from '../rows';

export async function getSession(db: SqlDb, id: string): Promise<Session | null> {
  const row = await db.get<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
  return row ? toSession(row) : null;
}

/** The single running/paused session, if any (`active_slot = 1`). */
export async function getActiveSession(db: SqlDb): Promise<Session | null> {
  const row = await db.get<SessionRow>('SELECT * FROM sessions WHERE active_slot = 1');
  return row ? toSession(row) : null;
}

export async function listPauses(db: SqlDb, sessionId: string): Promise<SessionPause[]> {
  const rows = await db.all<PauseRow>(
    'SELECT * FROM session_pauses WHERE session_id = ? ORDER BY started_at, id',
    [sessionId],
  );
  return rows.map(toPause);
}

export interface NewSession {
  id: string;
  mode: SessionMode;
  plannedSec: number | null;
  categoryId: string | null;
  taskId: string | null;
  habitOccurrenceId: string | null;
  blockingRequested: boolean;
}

/** Throws a UNIQUE constraint error when another session is already active. */
export async function insertActiveSession(db: SqlDb, input: NewSession, now: number): Promise<void> {
  await db.run(
    `INSERT INTO sessions (id, source, mode, status, active_slot, planned_sec, started_at, last_seen_at,
       category_id, task_id, habit_occurrence_id, blocking_requested, created_at, updated_at)
     VALUES (?, 'timer', ?, 'running', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.mode,
      input.plannedSec,
      now,
      now,
      input.categoryId,
      input.taskId,
      input.habitOccurrenceId,
      input.blockingRequested ? 1 : 0,
      now,
      now,
    ],
  );
}

export async function insertPause(db: SqlDb, id: string, sessionId: string, now: number): Promise<void> {
  await db.run('INSERT INTO session_pauses (id, session_id, started_at) VALUES (?, ?, ?)', [id, sessionId, now]);
}

export async function closeOpenPause(db: SqlDb, sessionId: string, endedAt: number): Promise<number> {
  const result = await db.run(
    'UPDATE session_pauses SET ended_at = MAX(started_at, ?) WHERE session_id = ? AND ended_at IS NULL',
    [endedAt, sessionId],
  );
  return result.changes;
}

/** Moves a running session to paused; no-op (0 changes) when it is in another state. */
export async function markPaused(db: SqlDb, sessionId: string, now: number): Promise<number> {
  const result = await db.run(
    `UPDATE sessions SET status = 'paused', updated_at = ? WHERE id = ? AND status = 'running' AND active_slot = 1`,
    [now, sessionId],
  );
  return result.changes;
}

export async function markRunning(db: SqlDb, sessionId: string, now: number): Promise<number> {
  const result = await db.run(
    `UPDATE sessions SET status = 'running', updated_at = ? WHERE id = ? AND status = 'paused' AND active_slot = 1`,
    [now, sessionId],
  );
  return result.changes;
}

export async function touchLastSeen(db: SqlDb, sessionId: string, now: number): Promise<void> {
  await db.run('UPDATE sessions SET last_seen_at = ? WHERE id = ? AND active_slot = 1', [now, sessionId]);
}

export interface FinalizeFields {
  status: 'completed' | 'stopped' | 'discarded';
  endedAt: number;
  focusedSec: number;
  stopReason: StopReason | null;
  stopNote: string | null;
}

/** Freezes an active session. Returns the number of rows changed (1 on success, 0 if not active). */
export async function finalizeActiveSession(
  db: SqlDb,
  sessionId: string,
  fields: FinalizeFields,
  now: number,
): Promise<number> {
  const result = await db.run(
    `UPDATE sessions
     SET status = ?, active_slot = NULL, ended_at = ?, focused_sec = ?, stop_reason = ?, stop_note = ?,
         finalized_at = ?, updated_at = ?
     WHERE id = ? AND active_slot = 1`,
    [
      fields.status,
      fields.endedAt,
      fields.focusedSec,
      fields.stopReason,
      fields.stopNote,
      now,
      now,
      sessionId,
    ],
  );
  return result.changes;
}

export async function insertDaySegments(
  db: SqlDb,
  sessionId: string,
  segments: readonly DayFocus[],
): Promise<void> {
  for (const segment of segments) {
    await db.run(
      'INSERT INTO session_day_segments (session_id, local_date, focused_sec) VALUES (?, ?, ?)',
      [sessionId, segment.localDate, segment.focusedSec],
    );
  }
}

export async function upsertRating(db: SqlDb, sessionId: string, rating: number, now: number): Promise<void> {
  await db.run(
    `INSERT INTO focus_ratings (session_id, rating, rated_at) VALUES (?, ?, ?)
     ON CONFLICT (session_id) DO UPDATE SET rating = excluded.rating, rated_at = excluded.rated_at`,
    [sessionId, rating, now],
  );
}

/** Null when the session was never rated (absence is not a zero). */
export async function getRating(db: SqlDb, sessionId: string): Promise<number | null> {
  const row = await db.get<{ rating: number }>('SELECT rating FROM focus_ratings WHERE session_id = ?', [sessionId]);
  return row?.rating ?? null;
}
