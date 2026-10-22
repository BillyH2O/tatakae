/** @jest-environment node */
import { createNodeDb } from '../../test/sqliteNodeDb';

async function setup() {
  const db = createNodeDb();
  await db.exec('CREATE TABLE counter (id INTEGER PRIMARY KEY, n INTEGER NOT NULL)');
  await db.run('INSERT INTO counter (id, n) VALUES (1, 0)');
  return db;
}

describe('serialized transactions', () => {
  it('commits all statements of a transaction', async () => {
    const db = await setup();
    await db.transaction(async (tx) => {
      await tx.run('UPDATE counter SET n = n + 1 WHERE id = 1');
      await tx.run('UPDATE counter SET n = n + 1 WHERE id = 1');
    });
    expect((await db.get<{ n: number }>('SELECT n FROM counter'))?.n).toBe(2);
  });

  it('rolls back every statement when the callback throws', async () => {
    const db = await setup();
    await expect(
      db.transaction(async (tx) => {
        await tx.run('UPDATE counter SET n = 99 WHERE id = 1');
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect((await db.get<{ n: number }>('SELECT n FROM counter'))?.n).toBe(0);
  });

  it('rolls back when a statement violates a constraint midway', async () => {
    const db = await setup();
    await expect(
      db.transaction(async (tx) => {
        await tx.run('UPDATE counter SET n = 5 WHERE id = 1');
        await tx.run('INSERT INTO counter (id, n) VALUES (1, 1)'); // duplicate primary key
      }),
    ).rejects.toThrow(/UNIQUE/);
    expect((await db.get<{ n: number }>('SELECT n FROM counter'))?.n).toBe(0);
  });

  it('serializes concurrent transactions (no lost update)', async () => {
    const db = await setup();
    const increment = () =>
      db.transaction(async (tx) => {
        const row = await tx.get<{ n: number }>('SELECT n FROM counter WHERE id = 1');
        await new Promise((resolve) => setTimeout(resolve, 2));
        await tx.run('UPDATE counter SET n = ? WHERE id = 1', [(row?.n ?? 0) + 1]);
      });
    await Promise.all(Array.from({ length: 20 }, increment));
    expect((await db.get<{ n: number }>('SELECT n FROM counter'))?.n).toBe(20);
  });

  it('never exposes uncommitted rows to readers outside the transaction', async () => {
    const db = await setup();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writing = db.transaction(async (tx) => {
      await tx.run('UPDATE counter SET n = 42 WHERE id = 1');
      await gate;
      throw new Error('abort after readers queued');
    });
    const read = db.get<{ n: number }>('SELECT n FROM counter WHERE id = 1');
    release();
    await expect(writing).rejects.toThrow();
    expect((await read)?.n).toBe(0);
  });

  it('keeps working after a failed transaction', async () => {
    const db = await setup();
    await expect(db.transaction(async () => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await db.transaction(async (tx) => {
      await tx.run('UPDATE counter SET n = 7 WHERE id = 1');
    });
    expect((await db.get<{ n: number }>('SELECT n FROM counter'))?.n).toBe(7);
  });

  it('rejects use of a transaction handle after it closed', async () => {
    const db = await setup();
    let leaked: Parameters<Parameters<typeof db.transaction>[0]>[0] | undefined;
    await db.transaction(async (tx) => {
      leaked = tx;
    });
    await expect(leaked?.run('UPDATE counter SET n = 1')).rejects.toThrow(/closed/);
  });
});
