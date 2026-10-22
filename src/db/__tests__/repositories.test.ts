/** @jest-environment node */
import { asLocalDate as d } from '../../domain/time/localDate';
import { createSequentialIds } from '../../test/fakeClock';
import { createMigratedDb, T0 } from '../../test/factories';
import { DuplicateNameError } from '../errors';
import {
  appStateRepo,
  archiveCategory,
  createCategory,
  createProfile,
  getProfile,
  insertXpOnce,
  listCategories,
  listDailyGoalVersions,
  listWeeklyGoalVersions,
  reorderCategories,
  restoreCategory,
  settingsRepo,
  totalXp,
  updateCategory,
  updateProfile,
  upsertDailyGoal,
  upsertWeeklyGoal,
  xpForSession,
} from '../repositories';
import { resolveDayGoal } from '../../domain/goals';

describe('profile repository', () => {
  it('has no profile on a fresh database, then stores and updates one', async () => {
    const db = await createMigratedDb();
    expect(await getProfile(db)).toBeNull();
    await createProfile(db, { displayName: '  Kaizen ', avatarUri: null, startLocalDate: d('2026-10-22') }, T0);
    expect(await getProfile(db)).toEqual({
      displayName: 'Kaizen',
      avatarUri: null,
      startLocalDate: '2026-10-22',
      createdAt: T0,
      updatedAt: T0,
    });
    await updateProfile(db, { avatarUri: 'file:///avatar.jpg' }, T0 + 5);
    expect(await getProfile(db)).toMatchObject({ displayName: 'Kaizen', avatarUri: 'file:///avatar.jpg', updatedAt: T0 + 5 });
  });

  it('allows a single profile row and rejects names over 24 characters', async () => {
    const db = await createMigratedDb();
    await createProfile(db, { displayName: 'A', avatarUri: null, startLocalDate: d('2026-10-22') }, T0);
    await expect(
      createProfile(db, { displayName: 'B', avatarUri: null, startLocalDate: d('2026-10-22') }, T0),
    ).rejects.toThrow();
    await expect(updateProfile(db, { displayName: 'x'.repeat(25) }, T0)).rejects.toThrow(/CHECK/);
  });
});

describe('categories repository', () => {
  const make = (id: string, name: string) => ({ id, name, icon: 'school', color: '#4C9BFF' });

  it('creates in order, keeps the order, and orders with reorder', async () => {
    const db = await createMigratedDb();
    await createCategory(db, make('a', 'Études'), T0);
    await createCategory(db, make('b', 'Projet'), T0);
    await createCategory(db, make('c', 'Lecture'), T0);
    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Études', 'Projet', 'Lecture']);
    await reorderCategories(db, ['c', 'a', 'b'], T0);
    expect((await listCategories(db)).map((c) => c.name)).toEqual(['Lecture', 'Études', 'Projet']);
  });

  it('enforces unique active names, case-insensitively', async () => {
    const db = await createMigratedDb();
    await createCategory(db, make('a', 'Études'), T0);
    await expect(createCategory(db, make('b', 'études'), T0)).rejects.toBeInstanceOf(DuplicateNameError);
    await createCategory(db, make('c', 'Sport'), T0);
    await expect(createCategory(db, make('d', 'ÉTUDES'), T0)).rejects.toBeInstanceOf(DuplicateNameError);
    await expect(updateCategory(db, 'c', { name: 'ÉTUDES' }, T0)).rejects.toBeInstanceOf(DuplicateNameError);
    await expect(updateCategory(db, 'a', { name: 'Études' }, T0)).resolves.toBeUndefined();
  });

  it('archives instead of deleting, frees the name, and blocks conflicting restore', async () => {
    const db = await createMigratedDb();
    await createCategory(db, make('a', 'Études'), T0);
    await archiveCategory(db, 'a', T0 + 1);
    expect(await listCategories(db)).toEqual([]);
    expect(await listCategories(db, { includeArchived: true })).toHaveLength(1);
    await createCategory(db, make('b', 'Études'), T0 + 2);
    await expect(restoreCategory(db, 'a', T0 + 3)).rejects.toBeInstanceOf(DuplicateNameError);
  });
});

describe('goal versions repository', () => {
  it('never rewrites past versions; same date replaces only itself', async () => {
    const db = await createMigratedDb();
    const ids = createSequentialIds('g');
    await upsertDailyGoal(db, { id: ids(), weekday: 4, effectiveFrom: d('2026-10-01'), goalMin: 120, isRest: false }, T0);
    await upsertDailyGoal(db, { id: ids(), weekday: 4, effectiveFrom: d('2026-10-22'), goalMin: 60, isRest: false }, T0);
    await upsertDailyGoal(db, { id: ids(), weekday: 4, effectiveFrom: d('2026-10-22'), goalMin: 45, isRest: false }, T0);
    const versions = await listDailyGoalVersions(db);
    expect(versions).toHaveLength(2);
    expect(resolveDayGoal(d('2026-10-15'), versions, d('2026-10-01'))).toEqual({ kind: 'goal', minutes: 120 });
    expect(resolveDayGoal(d('2026-10-22'), versions, d('2026-10-01'))).toEqual({ kind: 'goal', minutes: 45 });
  });

  it('stores rest days without goal and weekly goals', async () => {
    const db = await createMigratedDb();
    await upsertDailyGoal(db, { id: 'r', weekday: 7, effectiveFrom: d('2026-10-01'), goalMin: 90, isRest: true }, T0);
    expect((await listDailyGoalVersions(db))[0]).toMatchObject({ weekday: 7, isRest: true, goalMin: null });
    await upsertWeeklyGoal(db, { effectiveFrom: d('2026-10-19'), goalMin: 660 }, T0);
    await upsertWeeklyGoal(db, { effectiveFrom: d('2026-10-19'), goalMin: 700 }, T0);
    expect(await listWeeklyGoalVersions(db)).toEqual([{ effectiveFrom: '2026-10-19', goalMin: 700 }]);
  });
});

describe('xp repository (anti double reward)', () => {
  async function withSession() {
    const db = await createMigratedDb();
    await db.run(
      `INSERT INTO sessions (id, source, mode, status, planned_sec, started_at, ended_at, focused_sec, finalized_at, created_at, updated_at)
       VALUES ('s1', 'timer', 'countdown', 'completed', 1500, 1, 2, 1500, 2, 1, 1)`,
    );
    return db;
  }

  it('inserts a reward once per source key, even when called concurrently', async () => {
    const db = await withSession();
    const input = (id: string) => ({ id, sourceKey: 'session:s1:r0', sessionId: 's1', amount: 25, ruleVersion: 'xp-v1' });
    const results = await Promise.all([insertXpOnce(db, input('x1'), T0), insertXpOnce(db, input('x2'), T0)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await totalXp(db)).toBe(25);
    expect(await xpForSession(db, 's1')).toBe(25);
  });

  it('supports negative correction deltas under their own key', async () => {
    const db = await withSession();
    await insertXpOnce(db, { id: 'x1', sourceKey: 'session:s1:r0', sessionId: 's1', amount: 25, ruleVersion: 'xp-v1' }, T0);
    await insertXpOnce(db, { id: 'x2', sourceKey: 'session:s1:r1', sessionId: 's1', amount: -5, ruleVersion: 'xp-v1' }, T0);
    expect(await xpForSession(db, 's1')).toBe(20);
    expect(await totalXp(db)).toBe(20);
  });

  it('starts at zero', async () => {
    expect(await totalXp(await createMigratedDb())).toBe(0);
  });
});

describe('settings and app_state repositories', () => {
  it('round-trips JSON values, overwrites and removes', async () => {
    const db = await createMigratedDb();
    expect(await settingsRepo.get(db, 'timer')).toBeNull();
    await settingsRepo.set(db, 'timer', { focusMin: 25, breakMin: 5 }, T0);
    await settingsRepo.set(db, 'timer', { focusMin: 45, breakMin: 10 }, T0 + 1);
    expect(await settingsRepo.get(db, 'timer')).toEqual({ focusMin: 45, breakMin: 10 });
    await appStateRepo.set(db, 'priorityMission', { kind: 'task', id: 't1' }, T0);
    expect(await appStateRepo.get(db, 'priorityMission')).toEqual({ kind: 'task', id: 't1' });
    await appStateRepo.remove(db, 'priorityMission');
    expect(await appStateRepo.get(db, 'priorityMission')).toBeNull();
    expect(await settingsRepo.get(db, 'priorityMission')).toBeNull();
  });
});
