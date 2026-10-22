/** @jest-environment node */
import { PRODUCT } from '../../config/product';
import {
  getHabit,
  listCountedSessionsStartedBetween,
  listFocusByCategoryBetween,
  listFocusByDay,
  listOccurrencesForHabit,
  listSessionHistory,
} from '../../db/repositories';
import { asLocalDate as d, localInstant, startOfLocalDay, startOfNextLocalDay } from '../../domain/time/localDate';
import { createMigratedDb } from '../../test/factories';
import { createFakeClock, createSequentialIds } from '../../test/fakeClock';
import { createHabitQuest, updateHabitDetails } from '../questService';
import { finishSession, startSession } from '../sessionService';

const MIN = 60_000;
const TODAY = d('2026-10-22');

async function setup() {
  const clock = createFakeClock(localInstant(TODAY, 9, 0));
  const db = await createMigratedDb(clock.now());
  return { db, clock, newId: createSequentialIds('h') };
}
type Env = Awaited<ReturnType<typeof setup>>;

const habitInput = (over: Partial<Parameters<typeof createHabitQuest>[2]> = {}) => ({
  id: 'habit-1',
  title: 'Read',
  categoryId: null,
  weekdaysMask: 127,
  reminderTime: null,
  ...over,
});

describe('habit name, color and icon', () => {
  it('creates a habit with the chosen look, and the default look otherwise', async () => {
    const env = await setup();
    const color = PRODUCT.habits.colorPalette[4] as string;
    const icon = PRODUCT.habits.iconChoices[3] as string;
    await createHabitQuest(env.db, env.clock, habitInput({ title: '  Run  ', color, icon }), env.newId);
    await createHabitQuest(env.db, env.clock, habitInput({ id: 'habit-2' }), env.newId);
    expect(await getHabit(env.db, 'habit-1')).toMatchObject({ title: 'Run', color, icon });
    expect(await getHabit(env.db, 'habit-2')).toMatchObject({
      color: PRODUCT.habits.defaultColor,
      icon: PRODUCT.habits.defaultIcon,
    });
  });

  it('refuses a blank name', async () => {
    const env = await setup();
    await expect(createHabitQuest(env.db, env.clock, habitInput({ title: '   ' }), env.newId)).rejects.toThrow();
    expect(await getHabit(env.db, 'habit-1')).toBeNull();
  });

  it('renames and restyles a habit without touching its occurrences', async () => {
    const env = await setup();
    await createHabitQuest(env.db, env.clock, habitInput(), env.newId);
    const before = await listOccurrencesForHabit(env.db, 'habit-1');
    const color = PRODUCT.habits.colorPalette[6] as string;
    const icon = PRODUCT.habits.iconChoices[5] as string;

    await updateHabitDetails(env.db, env.clock, 'habit-1', { title: ' Read a lot ', color, icon });
    expect(await getHabit(env.db, 'habit-1')).toMatchObject({ title: 'Read a lot', color, icon });
    expect(await listOccurrencesForHabit(env.db, 'habit-1')).toEqual(before);

    await expect(updateHabitDetails(env.db, env.clock, 'habit-1', { title: ' ', color, icon })).rejects.toThrow();
    // An unknown color or icon never reaches the database as such.
    await updateHabitDetails(env.db, env.clock, 'habit-1', { title: 'Read', color: '#000000', icon: 'nope' });
    expect(await getHabit(env.db, 'habit-1')).toMatchObject({
      color: PRODUCT.habits.defaultColor,
      icon: PRODUCT.habits.defaultIcon,
    });
  });
});

describe('Stats scope (habits / other)', () => {
  async function twoSessions(env: Env) {
    await createHabitQuest(env.db, env.clock, habitInput(), env.newId);
    const occurrence = (await listOccurrencesForHabit(env.db, 'habit-1')).find((o) => o.localDate === TODAY);
    const run = async (minutes: number, habitOccurrenceId: string | null) => {
      const started = await startSession(env.db, env.clock, env.newId, {
        mode: 'countdown',
        plannedSec: minutes * 60,
        categoryId: null,
        taskId: null,
        habitOccurrenceId,
      });
      if (!started.ok) throw new Error('refused');
      env.clock.advance(minutes * MIN);
      await finishSession(env.db, env.clock, env.newId, started.sessionId);
      env.clock.advance(MIN);
    };
    await run(25, occurrence?.id ?? null); // habit session
    await run(10, null); // free session
  }

  it('splits focus per day, sessions, categories and history by scope; all = habits + other', async () => {
    const env = await setup();
    await twoSessions(env);
    const from = startOfLocalDay(TODAY);
    const to = startOfNextLocalDay(TODAY);

    const day = async (scope: 'all' | 'habits' | 'other') =>
      (await listFocusByDay(env.db, TODAY, TODAY, scope))[0]?.focusedSec ?? 0;
    expect(await day('habits')).toBe(25 * 60);
    expect(await day('other')).toBe(10 * 60);
    expect(await day('all')).toBe(35 * 60);

    const count = async (scope: 'all' | 'habits' | 'other') =>
      (await listCountedSessionsStartedBetween(env.db, from, to, scope)).length;
    expect([await count('habits'), await count('other'), await count('all')]).toEqual([1, 1, 2]);

    const categorySec = async (scope: 'all' | 'habits' | 'other') =>
      (await listFocusByCategoryBetween(env.db, TODAY, TODAY, scope)).reduce((sum, row) => sum + row.focusedSec, 0);
    expect(await categorySec('habits')).toBe(25 * 60);
    expect(await categorySec('other')).toBe(10 * 60);

    const history = async (scope: 'all' | 'habits' | 'other') => listSessionHistory(env.db, 10, scope);
    expect((await history('habits')).map((item) => item.questTitle)).toEqual(['Read']);
    expect((await history('other')).map((item) => item.questTitle)).toEqual([null]);
    expect(await history('all')).toHaveLength(2);
  });
});
