/** @jest-environment node */
import { createMigratedDb } from '../../test/factories';
import type { createNodeDb } from '../../test/sqliteNodeDb';

type Db = ReturnType<typeof createNodeDb>;

const NOW = 1_000;

async function session(db: Db, id: string, status: string, extra = '') {
  const active = status === 'running' || status === 'paused' ? 1 : 'NULL';
  const closed = active === 1 ? 'NULL, NULL, NULL' : `${NOW}, 60, ${NOW}`;
  await db.exec(
    `INSERT INTO sessions (id, source, mode, status, active_slot, planned_sec, started_at, ended_at, focused_sec, finalized_at, created_at, updated_at ${extra ? ', ' + extra.split('=')[0] : ''})
     VALUES ('${id}', 'timer', 'countdown', '${status}', ${active}, 1500, ${NOW}, ${closed}, ${NOW}, ${NOW} ${extra ? ', ' + extra.split('=')[1] : ''})`,
  );
}

describe('schema constraints', () => {
  let db: Db;
  beforeEach(async () => {
    db = await createMigratedDb();
  });

  it('rejects empty or blank titles and category names', async () => {
    await expect(
      db.run("INSERT INTO tasks (id, title, created_at, updated_at) VALUES ('t', '   ', 1, 1)"),
    ).rejects.toThrow(/CHECK/);
    await expect(
      db.run("INSERT INTO categories (id, name, icon, color, created_at, updated_at) VALUES ('c', '', 'x', 'y', 1, 1)"),
    ).rejects.toThrow(/CHECK/);
  });

  it('rejects a habit with no weekday or an invalid reminder', async () => {
    const insert = (mask: number, reminder: string | null) =>
      db.run(
        "INSERT INTO habits (id, title, weekdays_mask, reminder_time, start_local_date, created_at, updated_at) VALUES ('h', 'Lire', ?, ?, '2026-10-22', 1, 1)",
        [mask, reminder],
      );
    await expect(insert(0, null)).rejects.toThrow(/CHECK/);
    await expect(insert(128, null)).rejects.toThrow(/CHECK/);
    await expect(insert(5, '9:30')).rejects.toThrow(/CHECK/);
    await expect(insert(5, '07:30')).resolves.toBeDefined();
  });

  it('rejects a zero goal and a rest day carrying a goal', async () => {
    const insert = (min: number | null, rest: number) =>
      db.run(
        "INSERT INTO daily_goal_versions (id, weekday, effective_from, goal_min, is_rest, created_at) VALUES (?, 1, '2026-10-22', ?, ?, 1)",
        [`g${min}${rest}`, min, rest],
      );
    await expect(insert(0, 0)).rejects.toThrow(/CHECK/);
    await expect(insert(30, 1)).rejects.toThrow(/CHECK/);
    await expect(insert(null, 1)).resolves.toBeDefined();
  });

  it('allows only one active session (running or paused)', async () => {
    await session(db, 's1', 'running');
    await expect(session(db, 's2', 'paused')).rejects.toThrow(/UNIQUE/);
    await session(db, 's3', 'completed');
    await session(db, 's4', 'stopped');
    expect((await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM sessions'))?.n).toBe(3);
  });

  it('requires closed sessions to be fully finalized', async () => {
    await expect(
      db.run(
        "INSERT INTO sessions (id, source, mode, status, planned_sec, started_at, created_at, updated_at) VALUES ('x', 'timer', 'countdown', 'completed', 1500, 1, 1, 1)",
      ),
    ).rejects.toThrow(/CHECK/);
  });

  it('keeps active_slot consistent with status', async () => {
    await expect(
      db.run(
        "INSERT INTO sessions (id, source, mode, status, active_slot, planned_sec, started_at, created_at, updated_at) VALUES ('x', 'timer', 'countdown', 'completed', 1, 1500, 1, 1, 1)",
      ),
    ).rejects.toThrow(/CHECK/);
  });

  it('allows only one open pause per session', async () => {
    await session(db, 's1', 'running');
    await db.run("INSERT INTO session_pauses (id, session_id, started_at) VALUES ('p1', 's1', 10)");
    await expect(
      db.run("INSERT INTO session_pauses (id, session_id, started_at) VALUES ('p2', 's1', 20)"),
    ).rejects.toThrow(/UNIQUE/);
    await db.run("UPDATE session_pauses SET ended_at = 15 WHERE id = 'p1'");
    await expect(
      db.run("INSERT INTO session_pauses (id, session_id, started_at) VALUES ('p3', 's1', 20)"),
    ).resolves.toBeDefined();
  });

  it('rejects a session linked to both a task and an occurrence', async () => {
    await db.run("INSERT INTO tasks (id, title, created_at, updated_at) VALUES ('t1', 'Tâche', 1, 1)");
    await db.run(
      "INSERT INTO habits (id, title, weekdays_mask, start_local_date, created_at, updated_at) VALUES ('h1', 'Habitude', 1, '2026-10-22', 1, 1)",
    );
    await db.run(
      "INSERT INTO habit_occurrences (id, habit_id, local_date, created_at, updated_at) VALUES ('o1', 'h1', '2026-10-22', 1, 1)",
    );
    await expect(
      db.run(
        "INSERT INTO sessions (id, source, mode, status, active_slot, planned_sec, started_at, task_id, habit_occurrence_id, created_at, updated_at) VALUES ('x', 'timer', 'countdown', 'running', 1, 1500, 1, 't1', 'o1', 1, 1)",
      ),
    ).rejects.toThrow(/CHECK/);
  });

  it('enforces foreign keys', async () => {
    await expect(
      db.run("INSERT INTO session_pauses (id, session_id, started_at) VALUES ('p', 'missing', 1)"),
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it('rejects a second occurrence for the same habit and date', async () => {
    await db.run(
      "INSERT INTO habits (id, title, weekdays_mask, start_local_date, created_at, updated_at) VALUES ('h1', 'Habitude', 127, '2026-10-22', 1, 1)",
    );
    const insert = (id: string) =>
      db.run(
        'INSERT INTO habit_occurrences (id, habit_id, local_date, created_at, updated_at) VALUES (?, ?, ?, 1, 1)',
        [id, 'h1', '2026-10-22'],
      );
    await insert('o1');
    await expect(insert('o2')).rejects.toThrow(/UNIQUE/);
  });

  it('rejects a done task without completion info and a zero-amount wallet transaction', async () => {
    await expect(
      db.run("INSERT INTO tasks (id, title, status, created_at, updated_at) VALUES ('t', 'X', 'done', 1, 1)"),
    ).rejects.toThrow(/CHECK/);
    await expect(
      db.run(
        "INSERT INTO wallet_transactions (id, wallet_id, amount, reason, source_key, created_at) VALUES ('w', 'wallet-crystal', 0, 'r', 'k', 1)",
      ),
    ).rejects.toThrow(/CHECK/);
  });

  it('only accepts the crystal currency and a single wallet', async () => {
    await expect(
      db.run("INSERT INTO wallets (id, currency, created_at) VALUES ('w2', 'gold', 1)"),
    ).rejects.toThrow(/CHECK/);
    await expect(
      db.run("INSERT INTO wallets (id, currency, created_at) VALUES ('w3', 'crystal', 1)"),
    ).rejects.toThrow(/UNIQUE/);
  });
});
