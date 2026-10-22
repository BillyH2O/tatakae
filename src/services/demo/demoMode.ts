import { DEMO_DB_NAME } from '../../config/databaseNames';
import { getActiveSession } from '../../db/repositories';
import type { SqlDb } from '../../db/SqlDb';
import type { Clock } from '../clock';
import type { IdGenerator } from '../ids';
import { seedDemo } from './seedDemo';

export type DemoActionResult = { ok: true } | { ok: false; reason: 'session_active' };

/** Switching or regenerating closes the connection or wipes the data: never while a session runs or is paused. */
export async function canSwitchDatabase(db: SqlDb): Promise<DemoActionResult> {
  return (await getActiveSession(db)) ? { ok: false, reason: 'session_active' } : { ok: true };
}

/** Generates a fresh random history in the demo database (the one `db` must be connected to). */
export async function regenerateDemoData(
  db: SqlDb,
  clock: Clock,
  newId: IdGenerator,
  databaseName: string,
): Promise<DemoActionResult> {
  const allowed = await canSwitchDatabase(db);
  if (!allowed.ok) return allowed;
  await seedDemo(db, clock, newId, { databaseName });
  return { ok: true };
}

export const isDemoDatabase = (databaseName: string): boolean => databaseName === DEMO_DB_NAME;
