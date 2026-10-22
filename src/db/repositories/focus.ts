import type { RadarSession } from '../../domain/radar';
import type { CategoryFocus } from '../../domain/totals';
import type { DayFocus, LocalDate } from '../../domain/types';
import type { SqlDb } from '../SqlDb';

/** Focus seconds per local day of finalized, counted sessions (ARCHITECTURE.md §3.5). */
export async function listFocusByDay(db: SqlDb, from: LocalDate, to: LocalDate): Promise<DayFocus[]> {
  const rows = await db.all<{ local_date: string; focused_sec: number }>(
    `SELECT seg.local_date, SUM(seg.focused_sec) AS focused_sec
     FROM session_day_segments seg
     JOIN sessions s ON s.id = seg.session_id
     WHERE seg.local_date BETWEEN ? AND ? AND s.status IN ('completed', 'stopped')
     GROUP BY seg.local_date
     ORDER BY seg.local_date`,
    [from, to],
  );
  return rows.map((row) => ({ localDate: row.local_date as LocalDate, focusedSec: row.focused_sec }));
}

/** Focus seconds of one local day per category (null = uncategorized), finalized counted sessions only. */
export async function listFocusByCategory(db: SqlDb, date: LocalDate): Promise<CategoryFocus[]> {
  const rows = await db.all<{ category_id: string | null; focused_sec: number }>(
    `SELECT s.category_id, SUM(seg.focused_sec) AS focused_sec
     FROM session_day_segments seg
     JOIN sessions s ON s.id = seg.session_id
     WHERE seg.local_date = ? AND s.status IN ('completed', 'stopped')
     GROUP BY s.category_id`,
    [date],
  );
  return rows.map((row) => ({ categoryId: row.category_id, focusedSec: row.focused_sec }));
}

/** Finalized, counted sessions that ended in [fromMs, toMs), with their optional rating (radar input). */
export async function listRadarSessions(db: SqlDb, fromMs: number, toMs: number): Promise<RadarSession[]> {
  const rows = await db.all<{
    ended_at: number;
    status: RadarSession['status'];
    source: RadarSession['source'];
    mode: RadarSession['mode'];
    is_corrected: number;
    stop_reason: RadarSession['stopReason'];
    rating: number | null;
  }>(
    `SELECT s.ended_at, s.status, s.source, s.mode, s.is_corrected, s.stop_reason, r.rating
     FROM sessions s
     LEFT JOIN focus_ratings r ON r.session_id = s.id
     WHERE s.status IN ('completed', 'stopped') AND s.ended_at >= ? AND s.ended_at < ?
     ORDER BY s.ended_at`,
    [fromMs, toMs],
  );
  return rows.map((row) => ({
    endedAt: row.ended_at,
    status: row.status,
    source: row.source,
    mode: row.mode,
    isCorrected: row.is_corrected === 1,
    stopReason: row.stop_reason,
    rating: row.rating,
  }));
}
