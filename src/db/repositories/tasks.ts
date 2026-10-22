import type { LocalDate, Task, TaskPriority } from '../../domain/types';
import type { SqlDb } from '../SqlDb';
import { type TaskRow, toTask } from '../rows';

export async function listTasks(db: SqlDb): Promise<Task[]> {
  const rows = await db.all<TaskRow>('SELECT * FROM tasks ORDER BY created_at, id');
  return rows.map(toTask);
}

export async function getTask(db: SqlDb, id: string): Promise<Task | null> {
  const row = await db.get<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  return row ? toTask(row) : null;
}

export interface NewTask {
  id: string;
  title: string;
  categoryId: string | null;
  dueDate: LocalDate | null;
  priority: TaskPriority;
}

export async function createTask(db: SqlDb, input: NewTask, now: number): Promise<void> {
  await db.run(
    `INSERT INTO tasks (id, title, category_id, due_date, priority, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`,
    [input.id, input.title.trim(), input.categoryId, input.dueDate, input.priority, now, now],
  );
}

export async function updateTask(
  db: SqlDb,
  id: string,
  patch: {
    title?: string;
    categoryId?: string | null;
    dueDate?: LocalDate | null;
    priority?: TaskPriority;
  },
  now: number,
): Promise<void> {
  const current = await getTask(db, id);
  if (!current) throw new Error('Task not found');
  await db.run(
    `UPDATE tasks SET title = ?, category_id = ?, due_date = ?, priority = ?, updated_at = ? WHERE id = ?`,
    [
      (patch.title ?? current.title).trim(),
      patch.categoryId === undefined ? current.categoryId : patch.categoryId,
      patch.dueDate === undefined ? current.dueDate : patch.dueDate,
      patch.priority ?? current.priority,
      now,
      id,
    ],
  );
}

export async function completeTask(db: SqlDb, id: string, completedLocalDate: LocalDate, now: number): Promise<void> {
  await db.run(
    `UPDATE tasks SET status = 'done', completed_at = ?, completed_local_date = ?, updated_at = ?
     WHERE id = ? AND status = 'open'`,
    [now, completedLocalDate, now, id],
  );
}

export async function reopenTask(db: SqlDb, id: string, now: number): Promise<void> {
  await db.run(
    `UPDATE tasks SET status = 'open', completed_at = NULL, completed_local_date = NULL, updated_at = ?
     WHERE id = ? AND status = 'done'`,
    [now, id],
  );
}

export async function archiveTask(db: SqlDb, id: string, now: number): Promise<void> {
  await db.run(`UPDATE tasks SET status = 'archived', updated_at = ? WHERE id = ?`, [now, id]);
}
