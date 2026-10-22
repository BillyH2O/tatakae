import type { Category } from '../../domain/types';
import { DuplicateNameError, isUniqueConstraintError } from '../errors';
import type { SqlDb } from '../SqlDb';
import { type CategoryRow, toCategory } from '../rows';

/**
 * SQLite's NOCASE collation only folds ASCII ("Études" vs "études" would not collide), so the
 * Unicode-aware uniqueness check lives here; the unique index stays as an ASCII backstop.
 */
const normalizeName = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('fr');

async function assertNameAvailable(db: SqlDb, name: string, excludeId?: string): Promise<void> {
  const rows = await db.all<{ id: string; name: string }>(
    'SELECT id, name FROM categories WHERE archived_at IS NULL',
  );
  const wanted = normalizeName(name);
  if (rows.some((row) => row.id !== excludeId && normalizeName(row.name) === wanted)) {
    throw new DuplicateNameError(name);
  }
}

export async function listCategories(
  db: SqlDb,
  options: { includeArchived?: boolean } = {},
): Promise<Category[]> {
  const where = options.includeArchived ? '' : 'WHERE archived_at IS NULL';
  const rows = await db.all<CategoryRow>(
    `SELECT id, name, icon, color, sort_order, archived_at FROM categories ${where}
     ORDER BY sort_order, created_at`,
  );
  return rows.map(toCategory);
}

export interface NewCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export async function createCategory(db: SqlDb, input: NewCategory, now: number): Promise<void> {
  await db.transaction(async (tx) => {
    await assertNameAvailable(tx, input.name);
    const next = await tx.get<{ next: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories',
    );
    try {
      await tx.run(
        `INSERT INTO categories (id, name, icon, color, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input.id, input.name.trim(), input.icon, input.color, next?.next ?? 0, now, now],
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new DuplicateNameError(input.name);
      throw error;
    }
  });
}

export async function updateCategory(
  db: SqlDb,
  id: string,
  patch: { name?: string; icon?: string; color?: string },
  now: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await tx.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!current) throw new Error(`Unknown category ${id}`);
    const name = (patch.name ?? current.name).trim();
    if (current.archived_at === null) await assertNameAvailable(tx, name, id);
    try {
      await tx.run(
        'UPDATE categories SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?',
        [name, patch.icon ?? current.icon, patch.color ?? current.color, now, id],
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new DuplicateNameError(name);
      throw error;
    }
  });
}

/** Categories are never deleted: archiving keeps history readable. */
export async function archiveCategory(db: SqlDb, id: string, now: number): Promise<void> {
  await db.run('UPDATE categories SET archived_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
}

export async function restoreCategory(db: SqlDb, id: string, now: number): Promise<void> {
  await db.transaction(async (tx) => {
    const current = await tx.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!current) throw new Error(`Unknown category ${id}`);
    await assertNameAvailable(tx, current.name, id);
    await tx.run('UPDATE categories SET archived_at = NULL, updated_at = ? WHERE id = ?', [now, id]);
  });
}

export async function reorderCategories(
  db: SqlDb,
  orderedIds: readonly string[],
  now: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.run('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?', [index, now, id]);
    }
  });
}
