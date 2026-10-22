/** @jest-environment node */
import { asLocalDate as d } from '../../domain/time/localDate';
import { getCrystalBalance } from '../../features/crystals';
import { createMigratedDb, T0 } from '../../test/factories';
import type { SqlDb } from '../SqlDb';
import { listFocusByDay } from '../repositories';

async function insertSession(db: SqlDb, id: string, status: string, segments: [string, number][]) {
  const active = status === 'running' || status === 'paused';
  await db.run(
    `INSERT INTO sessions (id, source, mode, status, active_slot, planned_sec, started_at, ended_at, focused_sec,
       finalized_at, created_at, updated_at)
     VALUES (?, 'timer', 'stopwatch', ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    [id, status, active ? 1 : null, T0, active ? null : T0 + 1, active ? null : 1, active ? null : T0 + 1, T0, T0],
  );
  for (const [localDate, sec] of segments) {
    await db.run('INSERT INTO session_day_segments (session_id, local_date, focused_sec) VALUES (?, ?, ?)', [
      id,
      localDate,
      sec,
    ]);
  }
}

describe('listFocusByDay', () => {
  it('is empty on a fresh database', async () => {
    const db = await createMigratedDb();
    expect(await listFocusByDay(db, d('2026-10-19'), d('2026-10-25'))).toEqual([]);
  });

  it('sums counted sessions per day inside the range and ignores discarded ones', async () => {
    const db = await createMigratedDb();
    await insertSession(db, 'a', 'completed', [
      ['2026-10-21', 600],
      ['2026-10-22', 900],
    ]);
    await insertSession(db, 'b', 'stopped', [['2026-10-22', 300]]);
    await insertSession(db, 'c', 'discarded', [['2026-10-22', 50]]);
    await insertSession(db, 'd', 'completed', [['2026-10-26', 60]]);

    expect(await listFocusByDay(db, d('2026-10-19'), d('2026-10-25'))).toEqual([
      { localDate: '2026-10-21', focusedSec: 600 },
      { localDate: '2026-10-22', focusedSec: 1200 },
    ]);
  });
});

describe('getCrystalBalance', () => {
  it('starts at 0, then equals the sum of wallet transactions', async () => {
    const db = await createMigratedDb();
    expect(await getCrystalBalance(db)).toBe(0);
    await db.run(
      `INSERT INTO wallet_transactions (id, wallet_id, amount, reason, source_key, created_at)
       VALUES ('t1', 'wallet-crystal', 30, 'test', 'test:1', ?), ('t2', 'wallet-crystal', -10, 'test', 'test:2', ?)`,
      [T0, T0],
    );
    expect(await getCrystalBalance(db)).toBe(20);
  });
});
