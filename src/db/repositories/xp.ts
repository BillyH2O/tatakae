import type { XpTransaction } from '../../domain/types';
import type { SqlDb } from '../SqlDb';
import { type XpRow, toXpTransaction } from '../rows';

export interface NewXpTransaction {
  id: string;
  /** Idempotency key, e.g. `session:<id>:r0`. A second insert with the same key is ignored. */
  sourceKey: string;
  sessionId: string | null;
  amount: number;
  ruleVersion: string;
}

/** Returns true when the row was inserted, false when the reward already existed. */
export async function insertXpOnce(db: SqlDb, input: NewXpTransaction, now: number): Promise<boolean> {
  const result = await db.run(
    `INSERT OR IGNORE INTO xp_transactions (id, source_key, session_id, amount, rule_version, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.id, input.sourceKey, input.sessionId, input.amount, input.ruleVersion, now],
  );
  return result.changes === 1;
}

export async function totalXp(db: SqlDb): Promise<number> {
  const row = await db.get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) AS total FROM xp_transactions');
  return row?.total ?? 0;
}

export async function xpForSession(db: SqlDb, sessionId: string): Promise<number> {
  const row = await db.get<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM xp_transactions WHERE session_id = ?',
    [sessionId],
  );
  return row?.total ?? 0;
}

export async function listXpTransactions(db: SqlDb, sessionId: string): Promise<XpTransaction[]> {
  const rows = await db.all<XpRow>(
    'SELECT * FROM xp_transactions WHERE session_id = ? ORDER BY created_at, id',
    [sessionId],
  );
  return rows.map(toXpTransaction);
}
