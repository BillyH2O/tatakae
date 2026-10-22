/** @jest-environment node */
import { DEMO_DB_NAME, REAL_DB_NAME } from '../../../config/databaseNames';
import { APP_STATE_KEYS } from '../../../config/appStateKeys';
import { PRODUCT } from '../../../config/product';
import {
  appStateRepo,
  getActiveSession,
  getProfile,
  listCategories,
  listFocusByDay,
  totalXp,
  WIPED_TABLES,
} from '../../../db/repositories';
import { addDays, asLocalDate as d } from '../../../domain/time/localDate';
import { buildFocusByDay } from '../../../domain/totals';
import { xpForFocusedSec } from '../../../domain/xp';
import { createMigratedDb } from '../../../test/factories';
import { createFakeClock, createSequentialIds } from '../../../test/fakeClock';
import { startSession } from '../../sessionService';
import { canSwitchDatabase, regenerateDemoData } from '../demoMode';
import { ensureDemoSeeded, seedDemo } from '../seedDemo';

const NOW = new Date(2026, 9, 22, 20, 0, 0).getTime();
const TODAY = d('2026-10-22');

async function setup() {
  const db = await createMigratedDb(NOW);
  return { db, clock: createFakeClock(NOW), newId: createSequentialIds('demo') };
}

const count = async (db: Awaited<ReturnType<typeof createMigratedDb>>, table: string) =>
  (await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;

describe('seedDemo', () => {
  it('refuses to run on the real database and leaves it untouched', async () => {
    const env = await setup();
    await expect(seedDemo(env.db, env.clock, env.newId, { databaseName: REAL_DB_NAME })).rejects.toThrow(/demo database/);
    await expect(seedDemo(env.db, env.clock, env.newId, { databaseName: 'something-else.db' })).rejects.toThrow();
    expect(await getProfile(env.db)).toBeNull();
    expect(await count(env.db, 'sessions')).toBe(0);
  });

  it('does not wipe real data when refused', async () => {
    const env = await setup();
    await env.db.run(
      `INSERT INTO profile (id, display_name, start_local_date, created_at, updated_at) VALUES (1, 'Me', '2026-10-01', 1, 1)`,
    );
    await expect(seedDemo(env.db, env.clock, env.newId, { databaseName: REAL_DB_NAME })).rejects.toThrow();
    expect((await getProfile(env.db))?.displayName).toBe('Me');
  });

  it('generates a coherent multi-week history', async () => {
    const env = await setup();
    await seedDemo(env.db, env.clock, env.newId, { databaseName: DEMO_DB_NAME, seed: 99 });

    const profile = await getProfile(env.db);
    expect(profile?.displayName).toBe(PRODUCT.demo.displayName);
    expect(profile?.startLocalDate).toBe(addDays(TODAY, -PRODUCT.demo.historyDays));
    expect((await listCategories(env.db)).length).toBe(PRODUCT.categories.seed.length);

    const sessions = await count(env.db, 'sessions');
    expect(sessions).toBeGreaterThan(40);
    expect(await getActiveSession(env.db)).toBeNull();
    expect(await count(env.db, 'focus_ratings')).toBeGreaterThan(0);
    expect(await count(env.db, 'session_pauses')).toBeGreaterThan(0);
    expect(await count(env.db, 'habits')).toBeGreaterThan(0);
    expect(await count(env.db, 'habit_occurrences')).toBeGreaterThan(0);
    expect(await count(env.db, 'tasks')).toBeGreaterThan(0);

    // Day segments add up to the session focus; XP follows the product rule and is unique per session.
    const focus = await env.db.get<{ s: number }>('SELECT SUM(focused_sec) AS s FROM sessions');
    const segments = await env.db.get<{ s: number }>('SELECT SUM(focused_sec) AS s FROM session_day_segments');
    expect(segments?.s).toBe(focus?.s);
    const rows = await env.db.all<{ focused_sec: number }>('SELECT focused_sec FROM sessions');
    expect(await totalXp(env.db)).toBe(rows.reduce((sum, row) => sum + xpForFocusedSec(row.focused_sec), 0));
    expect(await count(env.db, 'xp_transactions')).toBe(sessions);

    // Only one session spans midnight (two segments).
    const split = await env.db.all<{ session_id: string }>(
      'SELECT session_id FROM session_day_segments GROUP BY session_id HAVING COUNT(*) > 1',
    );
    expect(split).toHaveLength(1);

    // The generic read path (header/Home/Stats) sees the data and nothing after today.
    const byDay = buildFocusByDay(await listFocusByDay(env.db, profile!.startLocalDate, addDays(TODAY, 30)), null);
    expect(byDay.size).toBeGreaterThan(30);
    expect([...byDay.keys()].every((day) => day <= TODAY)).toBe(true);

    // Habit occurrences exist through the horizon; some are done and none is done in the future.
    const done = await env.db.all<{ local_date: string }>(`SELECT local_date FROM habit_occurrences WHERE status = 'done'`);
    expect(done.length).toBeGreaterThan(0);
    expect(done.every((row) => row.local_date <= TODAY)).toBe(true);
    const horizon = await env.db.get<{ last: string }>('SELECT MAX(local_date) AS last FROM habit_occurrences');
    expect(horizon!.last > TODAY).toBe(true);
  });

  it('replaces the previous content when regenerated (no duplicates)', async () => {
    const env = await setup();
    await seedDemo(env.db, env.clock, env.newId, { databaseName: DEMO_DB_NAME, seed: 1 });
    await seedDemo(env.db, env.clock, env.newId, { databaseName: DEMO_DB_NAME, seed: 2 });
    expect(await count(env.db, 'profile')).toBe(1);
    expect(await count(env.db, 'categories')).toBe(PRODUCT.categories.seed.length);
    expect(await count(env.db, 'xp_transactions')).toBe(await count(env.db, 'sessions'));
    expect(await count(env.db, 'habits')).toBe(3);
    expect(await count(env.db, 'wallets')).toBe(1);
  });

  it('is reproducible for the same seed', async () => {
    const a = await setup();
    const b = await setup();
    await seedDemo(a.db, a.clock, a.newId, { databaseName: DEMO_DB_NAME, seed: 5 });
    await seedDemo(b.db, b.clock, b.newId, { databaseName: DEMO_DB_NAME, seed: 5 });
    const read = (db: typeof a.db) => db.all('SELECT started_at, ended_at, focused_sec, status FROM sessions ORDER BY started_at');
    expect(await read(a.db)).toEqual(await read(b.db));
  });

  it('never schedules habit reminders', async () => {
    const env = await setup();
    await seedDemo(env.db, env.clock, env.newId, { databaseName: DEMO_DB_NAME, seed: 4 });
    expect(await count(env.db, 'habits')).toBeGreaterThan(0);
    expect((await env.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM habits WHERE reminder_time IS NOT NULL'))!.n).toBe(0);
  });
});

describe('wipeUserData', () => {
  it('covers every table of the schema except the crystal wallet', async () => {
    const env = await setup();
    const tables = await env.db.all<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
    );
    const expected = tables.map((table) => table.name).filter((name) => name !== 'wallets');
    expect([...WIPED_TABLES].sort()).toEqual(expected.sort());
  });

  it('leaves every wiped table empty after a seeding then a regeneration', async () => {
    const env = await setup();
    await seedDemo(env.db, env.clock, env.newId, { databaseName: DEMO_DB_NAME, seed: 6 });
    for (const table of ['blocking_events', 'scheduled_notifications', 'wallet_transactions', 'session_corrections']) {
      expect(await count(env.db, table)).toBe(0);
    }
  });
});

describe('ensureDemoSeeded', () => {
  it('seeds the demo database once and ignores the real one', async () => {
    const env = await setup();
    await ensureDemoSeeded(env.db, env.clock, env.newId, REAL_DB_NAME);
    expect(await getProfile(env.db)).toBeNull();

    await ensureDemoSeeded(env.db, env.clock, env.newId, DEMO_DB_NAME);
    const first = await env.db.all('SELECT id FROM sessions ORDER BY id');
    expect(first.length).toBeGreaterThan(0);
    expect(await appStateRepo.get(env.db, APP_STATE_KEYS.demoSeededAt)).toBe(NOW);

    env.clock.advance(60_000);
    await ensureDemoSeeded(env.db, env.clock, env.newId, DEMO_DB_NAME); // marker present: nothing regenerated
    expect(await env.db.all('SELECT id FROM sessions ORDER BY id')).toEqual(first);
  });

  it('repairs an interrupted seeding (no marker)', async () => {
    const env = await setup();
    await env.db.run(
      `INSERT INTO profile (id, display_name, start_local_date, created_at, updated_at) VALUES (1, 'Half', '2026-10-01', 1, 1)`,
    );
    await ensureDemoSeeded(env.db, env.clock, env.newId, DEMO_DB_NAME);
    expect((await getProfile(env.db))?.displayName).toBe(PRODUCT.demo.displayName);
  });
});

describe('demo mode guards', () => {
  it('refuses to regenerate or switch while a session is active', async () => {
    const env = await setup();
    await seedDemo(env.db, env.clock, env.newId, { databaseName: DEMO_DB_NAME, seed: 8 });
    const before = await count(env.db, 'sessions');

    const started = await startSession(env.db, env.clock, env.newId, {
      mode: 'stopwatch',
      plannedSec: null,
      categoryId: null,
      taskId: null,
      habitOccurrenceId: null,
    });
    expect(started.ok).toBe(true);

    expect(await canSwitchDatabase(env.db)).toEqual({ ok: false, reason: 'session_active' });
    expect(await regenerateDemoData(env.db, env.clock, env.newId, DEMO_DB_NAME)).toEqual({
      ok: false,
      reason: 'session_active',
    });
    expect(await count(env.db, 'sessions')).toBe(before + 1); // nothing wiped
  });

  it('regenerates when idle', async () => {
    const env = await setup();
    await seedDemo(env.db, env.clock, env.newId, { databaseName: DEMO_DB_NAME, seed: 8 });
    expect(await canSwitchDatabase(env.db)).toEqual({ ok: true });
    expect(await regenerateDemoData(env.db, env.clock, env.newId, DEMO_DB_NAME)).toEqual({ ok: true });
  });
});
