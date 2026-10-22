import type { SqlDb } from './SqlDb';
import { MIGRATIONS } from './migrations';
import type { Migration } from './migrations/types';

export interface MigrateOptions {
  migrations?: readonly Migration[];
  now?: number;
}

export async function getSchemaVersion(db: SqlDb): Promise<number> {
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Applies pending migrations, each in its own transaction together with its `user_version`
 * bump: a failing migration leaves the database at the previous version, untouched.
 */
export async function migrate(db: SqlDb, options: MigrateOptions = {}): Promise<number> {
  const migrations = options.migrations ?? MIGRATIONS;
  const now = options.now ?? Date.now();
  let version = await getSchemaVersion(db);

  for (const migration of migrations) {
    if (migration.version <= version) continue;
    await db.transaction(async (tx) => {
      await migration.up(tx, { now });
      await tx.exec(`PRAGMA user_version = ${migration.version}`);
    });
    version = migration.version;
  }
  return version;
}
