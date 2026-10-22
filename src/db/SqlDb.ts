export type SqlParam = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

/** Minimal database interface shared by the Expo adapter and the Node (better-sqlite3) test adapter. */
export interface SqlDb {
  run(sql: string, params?: readonly SqlParam[]): Promise<RunResult>;
  get<T>(sql: string, params?: readonly SqlParam[]): Promise<T | null>;
  all<T>(sql: string, params?: readonly SqlParam[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  /**
   * Runs `fn` atomically (BEGIN IMMEDIATE … COMMIT, ROLLBACK on error). Every statement of the
   * transaction must go through the `tx` argument; calling the outer db from inside `fn` would
   * wait for the transaction to finish and deadlock.
   */
  transaction<T>(fn: (tx: SqlDb) => Promise<T>): Promise<T>;
}

/** Raw statement runner implemented per backend. */
export interface SqlDriver {
  run(sql: string, params: readonly SqlParam[]): Promise<RunResult>;
  get<T>(sql: string, params: readonly SqlParam[]): Promise<T | null>;
  all<T>(sql: string, params: readonly SqlParam[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}
