import type { SqlDb, SqlDriver } from './SqlDb';

/**
 * Wraps a single-connection driver so that:
 * - transactions are serialized through a FIFO mutex (no interleaving of writers);
 * - plain statements wait for an open transaction, so no reader ever sees uncommitted rows;
 * - a transaction either commits entirely or rolls back entirely.
 *
 * One code path is used on iOS, Android, web and in Node tests. (expo-sqlite's
 * `withExclusiveTransactionAsync` opens a second connection on which `PRAGMA foreign_keys`
 * is off and which is unavailable on web, so it is deliberately not used.)
 */
export function createSerializedDb(driver: SqlDriver): SqlDb {
  let tail: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };

  const db: SqlDb = {
    run: (sql, params = []) => enqueue(() => driver.run(sql, params)),
    get: <T>(sql: string, params = []) => enqueue(() => driver.get<T>(sql, params)),
    all: <T>(sql: string, params = []) => enqueue(() => driver.all<T>(sql, params)),
    exec: (sql) => enqueue(() => driver.exec(sql)),
    transaction: <T>(fn: (tx: SqlDb) => Promise<T>) =>
      enqueue(async () => {
        let open = true;
        const guard = () => {
          if (!open) throw new Error('Transaction already closed');
        };
        const tx: SqlDb = {
          run: async (sql, params = []) => (guard(), driver.run(sql, params)),
          get: async <U>(sql: string, params = []) => (guard(), driver.get<U>(sql, params)),
          all: async <U>(sql: string, params = []) => (guard(), driver.all<U>(sql, params)),
          exec: async (sql) => (guard(), driver.exec(sql)),
          transaction: (inner) => inner(tx),
        };
        await driver.exec('BEGIN IMMEDIATE');
        try {
          const result = await fn(tx);
          await driver.exec('COMMIT');
          return result;
        } catch (error) {
          try {
            await driver.exec('ROLLBACK');
          } catch {
            // SQLite may already have rolled back; keep the original error.
          }
          throw error;
        } finally {
          open = false;
        }
      }),
  };
  return db;
}
