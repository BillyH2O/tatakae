import type { SqlDb } from '../SqlDb';

export interface MigrationContext {
  now: number;
}

export interface Migration {
  version: number;
  name: string;
  up(tx: SqlDb, ctx: MigrationContext): Promise<void>;
}
