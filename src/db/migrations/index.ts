import { MIGRATION_001_INIT } from './001_init';
import { MIGRATION_002_HABIT_STYLE } from './002_habit_style';
import type { Migration } from './types';

/** Ordered, append-only. A shipped migration is never edited. */
export const MIGRATIONS: readonly Migration[] = [MIGRATION_001_INIT, MIGRATION_002_HABIT_STYLE];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
