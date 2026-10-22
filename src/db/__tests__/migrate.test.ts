/** @jest-environment node */
import { PRODUCT } from '../../config/product';
import { getSchemaVersion, migrate } from '../migrate';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '../migrations';
import type { Migration } from '../migrations/types';
import { T0 } from '../../test/factories';
import { createNodeDb } from '../../test/sqliteNodeDb';

const EXPECTED_TABLES = [
  'app_state',
  'blocking_events',
  'categories',
  'daily_goal_versions',
  'focus_ratings',
  'habit_occurrences',
  'habits',
  'profile',
  'scheduled_notifications',
  'session_corrections',
  'session_day_segments',
  'session_pauses',
  'sessions',
  'settings',
  'tasks',
  'wallet_transactions',
  'wallets',
  'weekly_goal_versions',
  'xp_transactions',
];

describe('migrations', () => {
  it('migrates an empty database to the latest version', async () => {
    const db = createNodeDb();
    expect(await getSchemaVersion(db)).toBe(0);
    const version = await migrate(db, { now: T0 });
    expect(version).toBe(LATEST_SCHEMA_VERSION);
    expect(version).toBe(2);
    expect(await getSchemaVersion(db)).toBe(2);

    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(EXPECTED_TABLES);
  });

  it('is idempotent: running twice changes nothing, wallet created once', async () => {
    const db = createNodeDb();
    await migrate(db, { now: T0 });
    await migrate(db, { now: T0 + 1000 });
    const wallets = await db.all<{ id: string; currency: string; created_at: number }>('SELECT * FROM wallets');
    expect(wallets).toEqual([{ id: 'wallet-crystal', currency: 'crystal', created_at: T0 }]);
    const txCount = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM wallet_transactions');
    expect(txCount?.n).toBe(0);
  });

  it('starts with no demo or seed data (real, empty database)', async () => {
    const db = createNodeDb();
    await migrate(db, { now: T0 });
    for (const table of ['profile', 'categories', 'tasks', 'habits', 'sessions', 'xp_transactions', 'daily_goal_versions']) {
      const row = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
      expect(`${table}:${row?.n}`).toBe(`${table}:0`);
    }
  });

  it('keeps existing data when a later migration is applied', async () => {
    const db = createNodeDb();
    await migrate(db, { now: T0 });
    await db.run(
      "INSERT INTO categories (id, name, icon, color, sort_order, created_at, updated_at) VALUES ('c1', 'Études', 'school', '#4C9BFF', 0, 1, 1)",
    );
    const v2: Migration = {
      version: 3,
      name: 'add-note',
      up: async (tx) => {
        await tx.exec('ALTER TABLE categories ADD COLUMN note TEXT');
      },
    };
    expect(await migrate(db, { migrations: [...MIGRATIONS, v2] })).toBe(3);
    const row = await db.get<{ name: string; note: string | null }>('SELECT name, note FROM categories');
    expect(row).toEqual({ name: 'Études', note: null });
  });

  it('002 gives existing habits the default color and icon without losing data', async () => {
    const db = createNodeDb();
    await migrate(db, { now: T0, migrations: MIGRATIONS.slice(0, 1) });
    await db.run(
      "INSERT INTO habits (id, title, weekdays_mask, start_local_date, created_at, updated_at) VALUES ('h1', 'Read', 127, '2026-10-22', 1, 1)",
    );
    expect(await migrate(db, { now: T0 })).toBe(2);
    const row = await db.get<{ title: string; color: string; icon: string }>('SELECT title, color, icon FROM habits');
    expect(row).toEqual({ title: 'Read', color: PRODUCT.habits.defaultColor, icon: PRODUCT.habits.defaultIcon });
  });

  it('rolls a failing migration back entirely, including user_version', async () => {
    const db = createNodeDb();
    await migrate(db, { now: T0 });
    const broken: Migration = {
      version: 3,
      name: 'broken',
      up: async (tx) => {
        await tx.exec('CREATE TABLE half_done (id INTEGER)');
        await tx.exec('THIS IS NOT SQL');
      },
    };
    await expect(migrate(db, { migrations: [...MIGRATIONS, broken] })).rejects.toThrow();
    expect(await getSchemaVersion(db)).toBe(LATEST_SCHEMA_VERSION);
    const leftover = await db.get('SELECT name FROM sqlite_master WHERE name = ?', ['half_done']);
    expect(leftover).toBeNull();
  });
});
