import type { CategoryFocus } from '../../domain/totals';
import type { CountedSession, SessionHistoryItem, StatsScope } from '../../domain/stats';
import type { LocalDate } from '../../domain/types';
import type { SqlDb } from '../SqlDb';
import { scopeClause } from './scope';

/** Counted (completed or stopped) sessions that started in [fromMs, toMs): the count/average of Stats. */
export async function listCountedSessionsStartedBetween(
  db: SqlDb,
  fromMs: number,
  toMs: number,
  scope: StatsScope = 'all',
): Promise<CountedSession[]> {
  const rows = await db.all<{ started_at: number; focused_sec: number }>(
    `SELECT started_at, focused_sec FROM sessions
     WHERE status IN ('completed', 'stopped') AND started_at >= ? AND started_at < ? AND ${scopeClause(scope, 'sessions')}
     ORDER BY started_at`,
    [fromMs, toMs],
  );
  return rows.map((row) => ({ startedAt: row.started_at, focusedSec: row.focused_sec }));
}

/** Focus seconds per category (null = uncategorized) over [from, to], from the day segments. */
export async function listFocusByCategoryBetween(
  db: SqlDb,
  from: LocalDate,
  to: LocalDate,
  scope: StatsScope = 'all',
): Promise<CategoryFocus[]> {
  const rows = await db.all<{ category_id: string | null; focused_sec: number }>(
    `SELECT s.category_id, SUM(seg.focused_sec) AS focused_sec
     FROM session_day_segments seg
     JOIN sessions s ON s.id = seg.session_id
     WHERE seg.local_date BETWEEN ? AND ? AND s.status IN ('completed', 'stopped') AND ${scopeClause(scope)}
     GROUP BY s.category_id`,
    [from, to],
  );
  return rows.map((row) => ({ categoryId: row.category_id, focusedSec: row.focused_sec }));
}

interface HistoryRow {
  id: string;
  source: 'timer' | 'manual';
  mode: 'countdown' | 'stopwatch' | null;
  status: 'completed' | 'stopped';
  started_at: number;
  ended_at: number;
  focused_sec: number;
  is_corrected: number;
  category_id: string | null;
  category_name: string | null;
  category_archived_at: number | null;
  quest_title: string | null;
  rating: number | null;
}

const HISTORY_SELECT = `
  SELECT s.id, s.source, s.mode, s.status, s.started_at, s.ended_at, s.focused_sec, s.is_corrected,
         s.category_id, c.name AS category_name, c.archived_at AS category_archived_at,
         COALESCE(t.title, h.title) AS quest_title, r.rating
  FROM sessions s
  LEFT JOIN categories c ON c.id = s.category_id
  LEFT JOIN tasks t ON t.id = s.task_id
  LEFT JOIN habit_occurrences o ON o.id = s.habit_occurrence_id
  LEFT JOIN habits h ON h.id = o.habit_id
  LEFT JOIN focus_ratings r ON r.session_id = s.id`;

const toHistoryItem = (row: HistoryRow): SessionHistoryItem => ({
  id: row.id,
  source: row.source,
  mode: row.mode,
  status: row.status,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  focusedSec: row.focused_sec,
  isCorrected: row.is_corrected === 1,
  categoryId: row.category_id,
  categoryName: row.category_name,
  categoryArchived: row.category_archived_at !== null,
  questTitle: row.quest_title,
  rating: row.rating,
});

/** Newest first. Fetch `limit + 1` to know whether there is a next page. */
export async function listSessionHistory(db: SqlDb, limit: number, scope: StatsScope = 'all'): Promise<SessionHistoryItem[]> {
  const rows = await db.all<HistoryRow>(
    `${HISTORY_SELECT}
     WHERE s.status IN ('completed', 'stopped') AND ${scopeClause(scope)}
     ORDER BY s.started_at DESC, s.id
     LIMIT ?`,
    [limit],
  );
  return rows.map(toHistoryItem);
}

export async function getSessionHistoryItem(db: SqlDb, id: string): Promise<SessionHistoryItem | null> {
  const row = await db.get<HistoryRow>(
    `${HISTORY_SELECT} WHERE s.id = ? AND s.status IN ('completed', 'stopped')`,
    [id],
  );
  return row ? toHistoryItem(row) : null;
}

export interface NewManualSession {
  id: string;
  startedAt: number;
  endedAt: number;
  focusedSec: number;
  categoryId: string | null;
  taskId: string | null;
  habitOccurrenceId: string | null;
}

/** A finished entry typed by hand: `source = 'manual'`, no timer mode. */
export async function insertManualSession(db: SqlDb, input: NewManualSession, now: number): Promise<void> {
  await db.run(
    `INSERT INTO sessions (id, source, mode, status, started_at, ended_at, focused_sec, category_id, task_id,
       habit_occurrence_id, finalized_at, created_at, updated_at)
     VALUES (?, 'manual', NULL, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.startedAt,
      input.endedAt,
      input.focusedSec,
      input.categoryId,
      input.taskId,
      input.habitOccurrenceId,
      now,
      now,
      now,
    ],
  );
}

/** Number of counted sessions whose interval intersects [startedAt, endedAt), `excludeId` aside. */
export async function countOverlappingSessions(
  db: SqlDb,
  startedAt: number,
  endedAt: number,
  excludeId: string | null = null,
): Promise<number> {
  const row = await db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM sessions
     WHERE status IN ('completed', 'stopped') AND started_at < ? AND ended_at > ? AND id <> ?`,
    [endedAt, startedAt, excludeId ?? ''],
  );
  return row?.n ?? 0;
}

export async function deleteDaySegments(db: SqlDb, sessionId: string): Promise<void> {
  await db.run('DELETE FROM session_day_segments WHERE session_id = ?', [sessionId]);
}

export async function applySessionCorrection(
  db: SqlDb,
  sessionId: string,
  fields: { endedAt: number; focusedSec: number; categoryId: string | null },
  now: number,
): Promise<void> {
  await db.run(
    `UPDATE sessions SET ended_at = ?, focused_sec = ?, category_id = ?, is_corrected = 1, updated_at = ?
     WHERE id = ? AND status IN ('completed', 'stopped')`,
    [fields.endedAt, fields.focusedSec, fields.categoryId, now, sessionId],
  );
}

export async function nextCorrectionRevision(db: SqlDb, sessionId: string): Promise<number> {
  const row = await db.get<{ revision: number | null }>(
    'SELECT MAX(revision) AS revision FROM session_corrections WHERE session_id = ?',
    [sessionId],
  );
  return (row?.revision ?? 0) + 1;
}

export async function insertCorrectionAudit(
  db: SqlDb,
  input: { id: string; sessionId: string; revision: number; before: unknown; after: unknown },
  now: number,
): Promise<void> {
  await db.run(
    `INSERT INTO session_corrections (id, session_id, revision, before_json, after_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.id, input.sessionId, input.revision, JSON.stringify(input.before), JSON.stringify(input.after), now],
  );
}