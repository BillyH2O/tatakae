import type { SqlDb } from '../SqlDb';

type KvTable = 'settings' | 'app_state';

function createKeyValueRepository(table: KvTable) {
  return {
    async get<T>(db: SqlDb, key: string): Promise<T | null> {
      const row = await db.get<{ value_json: string }>(
        `SELECT value_json FROM ${table} WHERE key = ?`,
        [key],
      );
      return row ? (JSON.parse(row.value_json) as T) : null;
    },
    async set<T>(db: SqlDb, key: string, value: T, now: number): Promise<void> {
      await db.run(
        `INSERT INTO ${table} (key, value_json, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
        [key, JSON.stringify(value), now],
      );
    },
    async remove(db: SqlDb, key: string): Promise<void> {
      await db.run(`DELETE FROM ${table} WHERE key = ?`, [key]);
    },
  };
}

export const settingsRepo = createKeyValueRepository('settings');
export const appStateRepo = createKeyValueRepository('app_state');
