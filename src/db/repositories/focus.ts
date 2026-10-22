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
