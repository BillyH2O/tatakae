/** @jest-environment node */
import { computeRadar } from '../../domain/radar';
import { asLocalDate as d, startOfLocalDay, startOfNextLocalDay } from '../../domain/time/localDate';
import { buildFocusByDay } from '../../domain/totals';
import { finishSession, rateSession, startSession } from '../../services/sessionService';
import { createMigratedDb } from '../../test/factories';
import { createFakeClock, createSequentialIds } from '../../test/fakeClock';
import { listDailyGoalVersions, listFocusByCategory, listFocusByDay, listRadarSessions } from '../repositories';

const MIN = 60_000;
const START = new Date(2026, 9, 22, 9, 0, 0).getTime();

async function setup() {
  const db = await createMigratedDb(START);
  await db.run(
    `INSERT INTO categories (id, name, icon, color, sort_order, created_at, updated_at) VALUES ('cat-a', 'Studies', 'school', '#fff', 0, 1, 1)`,
  );
  return { db, clock: createFakeClock(START), newId: createSequentialIds('h') };
}

async function runSession(
  env: Awaited<ReturnType<typeof setup>>,
  options: { minutes: number; categoryId: string | null; mode?: 'countdown' | 'stopwatch'; stopEarly?: boolean },
) {
  const mode = options.mode ?? 'countdown';
  const started = await startSession(env.db, env.clock, env.newId, {
    mode,
    plannedSec: mode === 'countdown' ? 25 * 60 : null,
    categoryId: options.categoryId,
    taskId: null,
    habitOccurrenceId: null,
  });
  if (!started.ok) throw new Error('refused');
  env.clock.advance(options.minutes * MIN);
  await finishSession(env.db, env.clock, env.newId, started.sessionId, { reason: options.stopEarly ? 'tired' : null });
  env.clock.advance(MIN);
  return started.sessionId;
}

describe('listFocusByCategory', () => {
  it('groups the day by category, with "uncategorized" as null', async () => {
    const env = await setup();
    await runSession(env, { minutes: 25, categoryId: 'cat-a' });
    await runSession(env, { minutes: 10, categoryId: 'cat-a', mode: 'stopwatch' });
    await runSession(env, { minutes: 5, categoryId: null, mode: 'stopwatch' });

    const rows = await listFocusByCategory(env.db, d('2026-10-22'));
    const byCategory = Object.fromEntries(rows.map((row) => [row.categoryId ?? 'none', row.focusedSec]));
    expect(byCategory).toEqual({ 'cat-a': 35 * 60, none: 5 * 60 });
    expect(await listFocusByCategory(env.db, d('2026-10-21'))).toEqual([]);
  });

  it('ignores discarded sessions', async () => {
    const env = await setup();
    const started = await startSession(env.db, env.clock, env.newId, {
      mode: 'stopwatch',
      plannedSec: null,
      categoryId: 'cat-a',
      taskId: null,
      habitOccurrenceId: null,
    });
    if (!started.ok) throw new Error('refused');
    env.clock.advance(20_000);
    await finishSession(env.db, env.clock, env.newId, started.sessionId, { discard: true });
    expect(await listFocusByCategory(env.db, d('2026-10-22'))).toEqual([]);
  });

  it('is consistent with the per-day totals used by the header', async () => {
    const env = await setup();
    await runSession(env, { minutes: 25, categoryId: 'cat-a' });
    await runSession(env, { minutes: 5, categoryId: null, mode: 'stopwatch' });
    const day = d('2026-10-22');
    const perDay = buildFocusByDay(await listFocusByDay(env.db, day, day)).get(day);
    const perCategory = (await listFocusByCategory(env.db, day)).reduce((sum, row) => sum + row.focusedSec, 0);
    expect(perCategory).toBe(perDay);
  });
});

describe('listRadarSessions', () => {
  it('returns finalized counted sessions in the window with their rating', async () => {
    const env = await setup();
    const rated = await runSession(env, { minutes: 25, categoryId: null });
    await rateSession(env.db, env.clock, rated, 4);
    await runSession(env, { minutes: 10, categoryId: null, stopEarly: true });
    await runSession(env, { minutes: 5, categoryId: null, mode: 'stopwatch' });

    const sessions = await listRadarSessions(
      env.db,
      startOfLocalDay(d('2026-10-09')),
      startOfNextLocalDay(d('2026-10-22')),
    );
    expect(sessions).toHaveLength(3);
    expect(sessions[0]).toMatchObject({ status: 'completed', source: 'timer', mode: 'countdown', rating: 4, isCorrected: false });
    expect(sessions[1]).toMatchObject({ status: 'stopped', stopReason: 'tired', rating: null });
    expect(sessions[2]).toMatchObject({ mode: 'stopwatch' });

    const outside = await listRadarSessions(env.db, startOfLocalDay(d('2026-10-23')), startOfNextLocalDay(d('2026-10-30')));
    expect(outside).toEqual([]);
  });

  it('feeds the radar: a completed + a stopped countdown give Mental 50, one rating is not enough for Strength', async () => {
    const env = await setup();
    const first = await runSession(env, { minutes: 25, categoryId: null });
    await rateSession(env.db, env.clock, first, 5);
    await runSession(env, { minutes: 10, categoryId: null, stopEarly: true });

    const today = d('2026-10-22');
    const sessions = await listRadarSessions(env.db, startOfLocalDay(d('2026-10-09')), startOfNextLocalDay(today));
    const axes = computeRadar({
      today,
      sessions,
      byDay: buildFocusByDay(await listFocusByDay(env.db, d('2026-10-09'), today)),
      dailyGoals: await listDailyGoalVersions(env.db),
      profileStart: d('2026-10-01'),
    });
    expect(axes.find((axis) => axis.axis === 'mental')?.value).toBe(50);
    expect(axes.find((axis) => axis.axis === 'strength')).toMatchObject({ value: null, status: 'insufficient' });
  });
});
