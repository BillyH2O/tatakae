import { MIGRATION_001_INIT } from './001_init';
import type { Migration } from './types';

/** Ordered, append-only. A shipped migration is never edited. */
export const MIGRATIONS: readonly Migration[] = [MIGRATION_001_INIT];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
