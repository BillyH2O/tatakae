import { migrate } from '../db/migrate';
import { createNodeDb } from './sqliteNodeDb';

export const T0 = new Date(2026, 9, 22, 9, 0, 0).getTime(); // 2026-10-22 09:00 local

export async function createMigratedDb(now = T0) {
  const db = createNodeDb();
  await migrate(db, { now });
  return db;
}
