import { isoWeekday } from '../../domain/time/localDate';
import { maskHasWeekday } from '../../domain/habits';
import { resolveHabitStyle } from '../../domain/habitStyle';
import type { Habit, HabitOccurrence, LocalDate } from '../../domain/types';
import type { SqlDb } from '../SqlDb';
import { type HabitRow, type OccurrenceRow, toHabit, toOccurrence } from '../rows';

export async function listHabits(db: SqlDb, options: { includeArchived?: boolean } = {}): Promise<Habit[]> {
  const where = options.includeArchived ? '' : "WHERE status = 'active'";
  const rows = await db.all<HabitRow>(`SELECT * FROM habits ${where} ORDER BY created_at, id`);
  return rows.map(toHabit);
}

export async function getHabit(db: SqlDb, id: string): Promise<Habit | null> {
  const row = await db.get<HabitRow>('SELECT * FROM habits WHERE id = ?', [id]);
  return row ? toHabit(row) : null;
}

export interface NewHabit {
  id: string;
  title: string;
  /** Optional: an invalid or missing value becomes the default look. */
  color?: string;
  icon?: string;
  categoryId: string | null;
  weekdaysMask: number;
  reminderTime: string | null;
  startLocalDate: LocalDate;
}

export async function createHabit(db: SqlDb, input: NewHabit, now: number): Promise<void> {
  const style = resolveHabitStyle(input);
  await db.run(
    `INSERT INTO habits (id, title, color, icon, category_id, weekdays_mask, reminder_time, status, start_local_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      input.id,
      input.title.trim(),
      style.color,
      style.icon,
      input.categoryId,
      input.weekdaysMask,
      input.reminderTime,
      input.startLocalDate,
      now,
      now,
    ],
  );
}

export async function updateHabit(
  db: SqlDb,
  id: string,
  patch: {
    title?: string;
    color?: string;
    icon?: string;
    categoryId?: string | null;
    weekdaysMask?: number;
    reminderTime?: string | null;
  },
  now: number,
): Promise<void> {
  const current = await getHabit(db, id);
  if (!current) throw new Error('Habit not found');
  const style = resolveHabitStyle({ color: patch.color ?? current.color, icon: patch.icon ?? current.icon });
  await db.run(
    `UPDATE habits SET title = ?, color = ?, icon = ?, category_id = ?, weekdays_mask = ?, reminder_time = ?, updated_at = ? WHERE id = ?`,
    [
      (patch.title ?? current.title).trim(),
      style.color,
      style.icon,
      patch.categoryId === undefined ? current.categoryId : patch.categoryId,
      patch.weekdaysMask ?? current.weekdaysMask,
      patch.reminderTime === undefined ? current.reminderTime : patch.reminderTime,
      now,
      id,
    ],
  );
}

export async function archiveHabit(db: SqlDb, id: string, archivedLocalDate: LocalDate, now: number): Promise<void> {
  await db.run(
    `UPDATE habits SET status = 'archived', archived_local_date = ?, updated_at = ? WHERE id = ?`,
    [archivedLocalDate, now, id],
  );
}

export async function listOccurrencesBetween(
  db: SqlDb,
  from: LocalDate,
  to: LocalDate,
): Promise<HabitOccurrence[]> {
  const rows = await db.all<OccurrenceRow>(
    'SELECT * FROM habit_occurrences WHERE local_date BETWEEN ? AND ? ORDER BY local_date, id',
    [from, to],
  );
  return rows.map(toOccurrence);
}

export async function listOccurrencesForDate(db: SqlDb, date: LocalDate): Promise<HabitOccurrence[]> {
  const rows = await db.all<OccurrenceRow>(
    'SELECT * FROM habit_occurrences WHERE local_date = ? ORDER BY created_at, id',
    [date],
  );
  return rows.map(toOccurrence);
}

export async function listOccurrencesForHabit(db: SqlDb, habitId: string): Promise<HabitOccurrence[]> {
  const rows = await db.all<OccurrenceRow>(
    'SELECT * FROM habit_occurrences WHERE habit_id = ? ORDER BY local_date, id',
    [habitId],
  );
  return rows.map(toOccurrence);
}

export async function getOccurrence(db: SqlDb, id: string): Promise<HabitOccurrence | null> {
  const row = await db.get<OccurrenceRow>('SELECT * FROM habit_occurrences WHERE id = ?', [id]);
  return row ? toOccurrence(row) : null;
}

export async function insertOccurrencesIgnore(
  db: SqlDb,
  rows: { id: string; habitId: string; localDate: LocalDate }[],
  now: number,
): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    const result = await db.run(
      `INSERT OR IGNORE INTO habit_occurrences (id, habit_id, local_date, status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [row.id, row.habitId, row.localDate, now, now],
    );
    inserted += result.changes;
  }
  return inserted;
}

/** Pending future occurrences without a linked session. Past rows are never deleted here. */
export async function deleteFuturePendingOccurrences(
  db: SqlDb,
  habitId: string,
  afterDate: LocalDate,
  weekdaysMask: number,
): Promise<void> {
  const rows = await db.all<{ id: string; local_date: string }>(
    `SELECT o.id, o.local_date FROM habit_occurrences o
     WHERE o.habit_id = ? AND o.local_date > ? AND o.status = 'pending'`,
    [habitId, afterDate],
  );
  for (const row of rows) {
    if (maskHasWeekday(weekdaysMask, isoWeekday(row.local_date as LocalDate))) continue;
    const linked = await db.get<{ n: number }>(
      'SELECT COUNT(*) AS n FROM sessions WHERE habit_occurrence_id = ?',
      [row.id],
    );
    if ((linked?.n ?? 0) > 0) continue;
    await db.run('DELETE FROM habit_occurrences WHERE id = ?', [row.id]);
  }
}

export async function completeOccurrence(db: SqlDb, id: string, now: number): Promise<void> {
  await db.run(
    `UPDATE habit_occurrences SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
    [now, now, id],
  );
}

export async function reopenOccurrence(db: SqlDb, id: string, now: number): Promise<void> {
  await db.run(
    `UPDATE habit_occurrences SET status = 'pending', completed_at = NULL, updated_at = ? WHERE id = ? AND status = 'done'`,
    [now, id],
  );
}
