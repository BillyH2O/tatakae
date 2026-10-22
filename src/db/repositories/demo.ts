import type { SqlDb } from '../SqlDb';

// Children first (foreign keys). `wallets` is kept: the single crystal wallet exists from migration 001.
const TABLES_TO_WIPE = [
  'blocking_events',
  'scheduled_notifications',
  'wallet_transactions',
  'xp_transactions',
  'session_corrections',
  'focus_ratings',
  'session_day_segments',
  'session_pauses',
  'sessions',
  'habit_occurrences',
  'habits',
  'tasks',
  'categories',
  'daily_goal_versions',
  'weekly_goal_versions',
  'settings',
  'app_state',
  'profile',
] as const;

/** Empties every user table. Only the demo seeding calls it, after checking it is on the demo database. */
export async function wipeUserData(db: SqlDb): Promise<void> {
  for (const table of TABLES_TO_WIPE) await db.run(`DELETE FROM ${table}`);
}

/** Names of the tables `wipeUserData` empties (tested against the real schema). */
export const WIPED_TABLES: readonly string[] = TABLES_TO_WIPE;