import type { SqlDb } from '../SqlDb';

export interface ScheduledNotification {
  key: string;
  notificationId: string;
  fireAt: number | null;
}

interface Row {
  key: string;
  notification_id: string;
  fire_at: number | null;
}

const toScheduled = (row: Row): ScheduledNotification => ({
  key: row.key,
  notificationId: row.notification_id,
  fireAt: row.fire_at,
});

export async function getScheduledNotification(db: SqlDb, key: string): Promise<ScheduledNotification | null> {
  const row = await db.get<Row>('SELECT key, notification_id, fire_at FROM scheduled_notifications WHERE key = ?', [
    key,
  ]);
  return row ? toScheduled(row) : null;
}

/** Keys starting with `prefix` (literal: `%`/`_` are escaped). */
export async function listScheduledNotifications(db: SqlDb, prefix = ''): Promise<ScheduledNotification[]> {
  const escaped = prefix.replace(/[\\%_]/g, (char) => `\\${char}`);
  const rows = await db.all<Row>(
    `SELECT key, notification_id, fire_at FROM scheduled_notifications WHERE key LIKE ? ESCAPE '\\' ORDER BY key`,
    [`${escaped}%`],
  );
  return rows.map(toScheduled);
}

export async function upsertScheduledNotification(
  db: SqlDb,
  entry: ScheduledNotification,
  now: number,
): Promise<void> {
  await db.run(
    `INSERT INTO scheduled_notifications (key, notification_id, fire_at, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET notification_id = excluded.notification_id,
       fire_at = excluded.fire_at, created_at = excluded.created_at`,
    [entry.key, entry.notificationId, entry.fireAt, now],
  );
}

export async function deleteScheduledNotification(db: SqlDb, key: string): Promise<void> {
  await db.run('DELETE FROM scheduled_notifications WHERE key = ?', [key]);
}
