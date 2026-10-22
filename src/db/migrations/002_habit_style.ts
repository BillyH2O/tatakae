import type { SqlDb } from '../SqlDb';
import type { Migration } from './types';

/**
 * A habit gets its own color and icon (chosen by the user). Additive: existing habits keep their
 * data and receive the default look; the values are validated by the domain, not by SQL.
 */
export const MIGRATION_002_HABIT_STYLE: Migration = {
  version: 2,
  name: 'habit-style',
  async up(tx: SqlDb) {
    await tx.exec("ALTER TABLE habits ADD COLUMN color TEXT NOT NULL DEFAULT '#4C9BFF'");
    await tx.exec("ALTER TABLE habits ADD COLUMN icon TEXT NOT NULL DEFAULT 'repeat'");
  },
};
