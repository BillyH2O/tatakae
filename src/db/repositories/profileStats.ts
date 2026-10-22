import type { SqlDb } from '../SqlDb';

export interface ProfileLifetimeStats {
  totalFocusSec: number;
  sessionCount: number;
  activeDays: number;
}

/** Cumulative stats shown on the Profile screen (counted sessions only). */
export async function getProfileLifetimeStats(db: SqlDb): Promise<ProfileLifetimeStats> {
  const focus = await db.get<{ total: number }>(
    `SELECT COALESCE(SUM(seg.focused_sec), 0) AS total
     FROM session_day_segments seg
     JOIN sessions s ON s.id = seg.session_id
     WHERE s.status IN ('completed', 'stopped')`,
  );
  const sessions = await db.get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sessions WHERE status IN ('completed', 'stopped')`,
  );
  const days = await db.get<{ count: number }>(
    `SELECT COUNT(DISTINCT seg.local_date) AS count
     FROM session_day_segments seg
     JOIN sessions s ON s.id = seg.session_id
     WHERE s.status IN ('completed', 'stopped')`,
  );
  return {
    totalFocusSec: focus?.total ?? 0,
    sessionCount: sessions?.count ?? 0,
    activeDays: days?.count ?? 0,
  };
}
