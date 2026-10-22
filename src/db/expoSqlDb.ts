import type { SQLiteDatabase } from 'expo-sqlite';

import type { SqlDb, SqlDriver, SqlParam } from './SqlDb';
import { createSerializedDb } from './serializedDb';

const cache = new WeakMap<SQLiteDatabase, SqlDb>();

function expoDriver(db: SQLiteDatabase): SqlDriver {
  return {
    run: async (sql, params) => {
      const result = await db.runAsync(sql, [...params] as SqlParam[]);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowId };
    },
    get: <T>(sql: string, params: readonly SqlParam[]) =>
      db.getFirstAsync<T>(sql, [...params] as SqlParam[]),
    all: <T>(sql: string, params: readonly SqlParam[]) =>
      db.getAllAsync<T>(sql, [...params] as SqlParam[]),
    exec: (sql) => db.execAsync(sql),
  };
}

/** One serialized adapter per expo-sqlite connection, so the mutex is shared by every caller. */
export function toSqlDb(db: SQLiteDatabase): SqlDb {
  let adapter = cache.get(db);
  if (!adapter) {
    adapter = createSerializedDb(expoDriver(db));
    cache.set(db, adapter);
  }
  return adapter;
}

/** Per-connection pragmas. WAL is best-effort (not every backend supports it). */
export async function configureConnection(db: SqlDb): Promise<void> {
  try {
    await db.exec('PRAGMA journal_mode = WAL;');
  } catch {
    // Keep the default journal mode.
  }
  await db.exec('PRAGMA foreign_keys = ON;');
}
