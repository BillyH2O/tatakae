import Database from 'better-sqlite3';

import { createSerializedDb } from '../db/serializedDb';
import type { SqlDb, SqlDriver } from '../db/SqlDb';

/** In-memory (or file) SQLite for Node tests, behind the exact same adapter as the app. */
export function createNodeDb(filename = ':memory:'): SqlDb & { close(): void; raw: Database.Database } {
  const raw = new Database(filename);
  raw.pragma('foreign_keys = ON');
  const driver: SqlDriver = {
    run: async (sql, params) => {
      const info = raw.prepare(sql).run(...params);
      return { changes: info.changes, lastInsertRowId: Number(info.lastInsertRowid) };
    },
    get: async <T>(sql: string, params: readonly (string | number | null)[]) =>
      (raw.prepare(sql).get(...params) as T | undefined) ?? null,
    all: async <T>(sql: string, params: readonly (string | number | null)[]) =>
      raw.prepare(sql).all(...params) as T[],
    exec: async (sql) => {
      raw.exec(sql);
    },
  };
  return Object.assign(createSerializedDb(driver), { close: () => raw.close(), raw });
}
