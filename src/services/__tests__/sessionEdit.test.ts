/** @jest-environment node */
import { PRODUCT } from '../../config/product';
import {
  archiveCategory,
  getRating,
  getSession,
  getSessionHistoryItem,
  listCategories,
  listCountedSessionsStartedBetween,
  listFocusByCategoryBetween,
  listFocusByDay,
  listRadarSessions,
  listSessionHistory,
  listXpTransactions,
  totalXp,
  xpForSession,
} from '../../db/repositories';
import { periodKpis, periodRange, sessionBadges } from '../../domain/stats';
import { addDays, asLocalDate as d, localInstant, startOfLocalDay, startOfNextLocalDay } from '../../domain/time/localDate';
import { buildFocusByDay, categoryBars, headerTotals } from '../../domain/totals';
import { xpForFocusedSec } from '../../domain/xp';
import { createMigratedDb } from '../../test/factories';
import { createFakeClock, createSequentialIds } from '../../test/fakeClock';
import {
  correctSession,
  createManualSession,
  finishSession,
  rateSession,
  startSession,
} from '../sessionService';

const MIN = 60_000;
const NOW = localInstant(d('2026-10-22'), 15, 0);

async function setup() {
  const db = await createMigratedDb(NOW);
  await db.run(
    `INSERT INTO categories (id, name, icon, color, sort_order, created_at, updated_at) VALUES ('cat-a', 'Studies', 'school', '#fff', 0, 1, 1), ('cat-b', 'Sport', 'run', '#eee', 1, 1, 1)`,
  );
  const clock = createFakeClock(localInstant(d('2026-10-22'), 9, 0));
  return { db, clock, newId: createSequentialIds('e') };
}
type Env = Awaited<ReturnType<typeof setup>>;

/** A finished 25-minute countdown started at 09:00 today. */
async function timerSession(env: Env, minutes = 25, categoryId: string | null = 'cat-a') {
  const started = await startSession(env.db, env.clock, env.newId, {
    mode: 'countdown',
    plannedSec: minutes * 60,
    categoryId,
    taskId: null,
    habitOccurrenceId: null,
  });
  if (!started.ok) throw new Error('refused');
  env.clock.advance(minutes * MIN);
  await finishSession(env.db, env.clock, env.newId, started.sessionId);
  env.clock.set(NOW);
  return started.sessionId;
}

const manual = (env: Env, over: Partial<Parameters<typeof createManualSession>[3]> = {}) =>
  createManualSession(env.db, env.clock, env.newId, {
    date: d('2026-10-21'),
    time: '10:00',
    durationMin: 30,
    categoryId: 'cat-b',
    taskId: null,
    habitOccurrenceId: null,
    allowOverlap: false,
    ...over,
  });

describe('correctSession', () => {
  it('25 → 20 min: stats updated, XP −5 (r1), audit row, badge, excluded from Mental', async () => {
    const env = await setup();
    const id = await timerSession(env, 25);
    await rateSession(env.db, env.clock, id, 4);
    expect(await xpForSession(env.db, id)).toBe(25);

    const result = await correctSession(env.db, env.clock, env.newId, id, { focusedSec: 20 * 60, categoryId: 'cat-a' });
    expect(result).toEqual({ ok: true, changed: true, xpDelta: -5 });

    const session = await getSession(env.db, id);
    expect(session).toMatchObject({ focusedSec: 1200, status: 'completed' });
    expect((await getSessionHistoryItem(env.db, id))?.isCorrected).toBe(true);
    expect(session?.endedAt).toBe(session!.startedAt + 20 * MIN);

    // XP invariant: Σ xp(session) = xpForFocusedSec(focused_sec) with an `r1` row of −5.
    const rows = await listXpTransactions(env.db, id);
    expect(rows.map((row) => [row.sourceKey, row.amount]).sort()).toEqual([
      [`session:${id}:r0`, 25],
      [`session:${id}:r1`, -5],
    ]);
    expect(await xpForSession(env.db, id)).toBe(xpForFocusedSec(1200));
    expect(await totalXp(env.db)).toBe(20);

    // Segments recomputed; totals follow.
    const byDay = buildFocusByDay(await listFocusByDay(env.db, d('2026-10-19'), d('2026-10-25')));
    expect(byDay.get(d('2026-10-22'))).toBe(1200);

    // Audit trail.
    const audit = await env.db.all<{ revision: number; before_json: string; after_json: string }>(
      'SELECT revision, before_json, after_json FROM session_corrections WHERE session_id = ?',
      [id],
    );
    expect(audit).toHaveLength(1);
    expect(JSON.parse(audit[0]!.before_json)).toMatchObject({ focusedSec: 1500 });
    expect(JSON.parse(audit[0]!.after_json)).toMatchObject({ focusedSec: 1200 });

    // History badge and exclusion from the Mental axis.
    const item = await getSessionHistoryItem(env.db, id);
    expect(item && sessionBadges(item)).toEqual(['corrected']);
    const radar = await listRadarSessions(env.db, startOfLocalDay(d('2026-10-22')), startOfNextLocalDay(d('2026-10-22')));
    expect(radar).toHaveLength(1);
    expect(radar[0]?.isCorrected).toBe(true);
    expect(await getRating(env.db, id)).toBe(4); // the rating is kept
  });

  it('chains corrections with increasing revisions and keeps the invariant', async () => {
    const env = await setup();
    const id = await timerSession(env, 25);
    await correctSession(env.db, env.clock, env.newId, id, { focusedSec: 20 * 60, categoryId: 'cat-a' });
    await correctSession(env.db, env.clock, env.newId, id, { focusedSec: 40 * 60, categoryId: 'cat-a' });
    await correctSession(env.db, env.clock, env.newId, id, { focusedSec: 33 * 60, categoryId: 'cat-b' });
    expect(await xpForSession(env.db, id)).toBe(33);
    const revisions = await env.db.all<{ revision: number }>('SELECT revision FROM session_corrections WHERE session_id = ? ORDER BY revision', [id]);
    expect(revisions.map((row) => row.revision)).toEqual([1, 2, 3]);
    expect((await getSession(env.db, id))?.categoryId).toBe('cat-b');
  });

  it('category only: no XP row, still audited and flagged', async () => {
    const env = await setup();
    const id = await timerSession(env, 25);
    const result = await correctSession(env.db, env.clock, env.newId, id, { focusedSec: 1500, categoryId: 'cat-b' });
    expect(result).toEqual({ ok: true, changed: true, xpDelta: 0 });
    expect(await listXpTransactions(env.db, id)).toHaveLength(1);
    const byCategory = await listFocusByCategoryBetween(env.db, d('2026-10-22'), d('2026-10-22'));
    expect(byCategory).toEqual([{ categoryId: 'cat-b', focusedSec: 1500 }]);
  });

  it('is a no-op when nothing changes, and refuses invalid values atomically', async () => {
    const env = await setup();
    const id = await timerSession(env, 25);
    expect(await correctSession(env.db, env.clock, env.newId, id, { focusedSec: 1500, categoryId: 'cat-a' })).toEqual({
      ok: true,
      changed: false,
      xpDelta: 0,
    });
    expect(await correctSession(env.db, env.clock, env.newId, id, { focusedSec: 10, categoryId: 'cat-a' })).toEqual({ ok: false, error: 'too_short' });
    expect(await correctSession(env.db, env.clock, env.newId, id, { focusedSec: 8 * 3600, categoryId: 'cat-a' })).toEqual({ ok: false, error: 'in_future' });
    expect(await correctSession(env.db, env.clock, env.newId, 'missing', { focusedSec: 1500, categoryId: null })).toEqual({ ok: false, error: 'not_found' });
    expect((await getSessionHistoryItem(env.db, id))?.isCorrected).toBe(false);
    expect(await env.db.get('SELECT 1 FROM session_corrections')).toBeNull();
    expect(await xpForSession(env.db, id)).toBe(25);
  });

  it('refuses to correct a running session', async () => {
    const env = await setup();
    const started = await startSession(env.db, env.clock, env.newId, { mode: 'stopwatch', plannedSec: null, categoryId: null, taskId: null, habitOccurrenceId: null });
    if (!started.ok) throw new Error('refused');
    expect(await correctSession(env.db, env.clock, env.newId, started.sessionId, { focusedSec: 600, categoryId: null })).toEqual({ ok: false, error: 'not_found' });
  });

  it('re-splits a corrected session that crosses midnight', async () => {
    const env = await setup();
    const created = await manual(env, { date: d('2026-10-20'), time: '23:00', durationMin: 30 });
    if (!created.ok) throw new Error('refused');
    await correctSession(env.db, env.clock, env.newId, created.sessionId, { focusedSec: 90 * 60, categoryId: 'cat-b' });
    const byDay = buildFocusByDay(await listFocusByDay(env.db, d('2026-10-20'), d('2026-10-21')));
    expect(byDay.get(d('2026-10-20'))).toBe(3600);
    expect(byDay.get(d('2026-10-21'))).toBe(1800);
  });
});

describe('createManualSession', () => {
  it('creates a manual session with segments, XP and the Manual badge', async () => {
    const env = await setup();
    const result = await manual(env);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const session = await getSession(env.db, result.sessionId);
    expect(session).toMatchObject({ source: 'manual', mode: null, status: 'completed', focusedSec: 1800 });
    expect((await getSessionHistoryItem(env.db, result.sessionId))?.isCorrected).toBe(false);
    expect(await xpForSession(env.db, result.sessionId)).toBe(30);
    const item = await getSessionHistoryItem(env.db, result.sessionId);
    expect(item && sessionBadges(item)).toEqual(['manual']);
    expect(item).toMatchObject({ categoryName: 'Sport', categoryArchived: false });
  });

  it('earns no XP when the product rule says so', async () => {
    const env = await setup();
    const rule = PRODUCT.xp as { manualEntriesEarnXp: boolean };
    const previous = rule.manualEntriesEarnXp;
    rule.manualEntriesEarnXp = false;
    try {
      const result = await manual(env);
      if (!result.ok) throw new Error('refused');
      expect(await xpForSession(env.db, result.sessionId)).toBe(0);
    } finally {
      rule.manualEntriesEarnXp = previous;
    }
  });

  it('refuses the future, bad input, and an overlap until the user confirms', async () => {
    const env = await setup();
    expect(await manual(env, { date: d('2026-10-23') })).toEqual({ ok: false, error: 'in_future' });
    expect(await manual(env, { time: '99:00' })).toEqual({ ok: false, error: 'invalid_time' });
    expect(await manual(env, { durationMin: 0 })).toEqual({ ok: false, error: 'too_short' });
    expect(await manual(env)).toMatchObject({ ok: true });
    expect(await manual(env, { time: '10:15' })).toEqual({ ok: false, error: 'overlap' });
    expect(await manual(env, { time: '10:30' })).toMatchObject({ ok: true }); // adjacent is not an overlap
    expect(await manual(env, { time: '10:15', allowOverlap: true })).toMatchObject({ ok: true });
    expect((await listSessionHistory(env.db, 50)).length).toBe(3);
  });

  it('splits an entry across midnight and links a quest', async () => {
    const env = await setup();
    await env.db.run(`INSERT INTO tasks (id, title, status, priority, created_at, updated_at) VALUES ('t1', 'Essay', 'open', 1, 1, 1)`);
    const result = await manual(env, { date: d('2026-10-20'), time: '23:45', durationMin: 30, taskId: 't1' });
    if (!result.ok) throw new Error('refused');
    const byDay = buildFocusByDay(await listFocusByDay(env.db, d('2026-10-20'), d('2026-10-21')));
    expect([byDay.get(d('2026-10-20')), byDay.get(d('2026-10-21'))]).toEqual([900, 900]);
    expect((await getSessionHistoryItem(env.db, result.sessionId))?.questTitle).toBe('Essay');
  });
});

describe('stats consistency', () => {
  it('week totals are identical for the header and the Stats KPIs on the same dataset', async () => {
    const env = await setup();
    await timerSession(env, 25);
    await manual(env, { date: d('2026-10-20'), time: '08:00', durationMin: 50 });
    await manual(env, { date: d('2026-10-18'), time: '22:00', durationMin: 45 }); // previous week

    const today = d('2026-10-22');
    const range = periodRange('week', today);
    const byDay = buildFocusByDay(await listFocusByDay(env.db, range.from, range.to));
    const sessions = await listCountedSessionsStartedBetween(env.db, startOfLocalDay(range.from), startOfNextLocalDay(range.to));

    const header = headerTotals({ today, byDay, profileStart: d('2026-08-01'), dailyGoals: [], weeklyGoals: [] });
    const kpis = periodKpis(range, byDay, sessions);
    expect(kpis.focusSec).toBe(header.week.focusSec);
    expect(kpis.focusSec).toBe((25 + 50) * 60);
    expect(kpis.sessionCount).toBe(2);
    expect(kpis.avgSessionSec).toBe(Math.floor(((25 + 50) * 60) / 2));
  });

  it('month without data: zeros, no average', async () => {
    const env = await setup();
    const range = periodRange('month', d('2026-05-10'));
    const byDay = buildFocusByDay(await listFocusByDay(env.db, range.from, range.to));
    const sessions = await listCountedSessionsStartedBetween(env.db, startOfLocalDay(range.from), startOfNextLocalDay(range.to));
    expect(periodKpis(range, byDay, sessions)).toEqual({ focusSec: 0, sessionCount: 0, avgSessionSec: null });
  });

  it('a session across two months is split by day segments but counted once', async () => {
    const env = await setup();
    env.clock.set(localInstant(d('2026-11-05'), 12, 0));
    const created = await createManualSession(env.db, env.clock, env.newId, {
      date: d('2026-10-31'), time: '23:30', durationMin: 60, categoryId: null, taskId: null, habitOccurrenceId: null, allowOverlap: false,
    });
    expect(created.ok).toBe(true);
    const oct = periodRange('month', d('2026-10-15'));
    const nov = periodRange('month', d('2026-11-15'));
    const read = async (range: typeof oct) => {
      const byDay = buildFocusByDay(await listFocusByDay(env.db, range.from, range.to));
      const sessions = await listCountedSessionsStartedBetween(env.db, startOfLocalDay(range.from), startOfNextLocalDay(range.to));
      return periodKpis(range, byDay, sessions);
    };
    expect(await read(oct)).toMatchObject({ focusSec: 1800, sessionCount: 1 });
    expect(await read(nov)).toMatchObject({ focusSec: 1800, sessionCount: 0 });
  });

  it('an archived category stays in the history and in the breakdown, flagged archived', async () => {
    const env = await setup();
    await timerSession(env, 25, 'cat-a');
    await archiveCategory(env.db, 'cat-a', NOW);
    const [item] = await listSessionHistory(env.db, 5);
    expect(item).toMatchObject({ categoryName: 'Studies', categoryArchived: true });
    const rows = await listFocusByCategoryBetween(env.db, d('2026-10-19'), d('2026-10-25'));
    const bars = categoryBars(rows, await listCategories(env.db, { includeArchived: true }));
    expect(bars[0]?.category?.archivedAt).not.toBeNull();
    expect(bars[0]?.focusedSec).toBe(1500);
    expect(addDays(d('2026-10-22'), 0)).toBe('2026-10-22');
  });
});
