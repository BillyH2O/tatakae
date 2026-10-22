/** @jest-environment node */
import { asLocalDate as d } from '../../domain/time/localDate';
import { defaultDailyGoalDrafts } from '../../domain/onboardingGoals';
import { getProfile, listCategories, listDailyGoalVersions, listWeeklyGoalVersions } from '../../db/repositories';
import { createMigratedDb, T0 } from '../../test/factories';
import { createFakeClock, createSequentialIds } from '../../test/fakeClock';
import { completeOnboarding } from '../profileService';

describe('completeOnboarding', () => {
  it('creates profile, goals, categories and timer defaults atomically', async () => {
    const db = await createMigratedDb(T0);
    await completeOnboarding(
      db,
      createFakeClock(T0),
      {
        displayName: '  Kaizen  ',
        avatarUri: null,
        dailyGoals: defaultDailyGoalDrafts(),
        weeklyGoalMin: 660,
      },
      createSequentialIds(),
      async (uri) => uri,
    );

    expect(await getProfile(db)).toMatchObject({
      displayName: 'Kaizen',
      avatarUri: null,
      startLocalDate: d('2026-10-22'),
    });
    expect((await listCategories(db)).map((c) => c.name)).toEqual([
      'Studies',
      'Project',
      'Reading',
      'Sport',
    ]);
    const daily = await listDailyGoalVersions(db);
    expect(daily.filter((v) => v.weekday === 4 && v.effectiveFrom === '2026-10-22')).toEqual([
      expect.objectContaining({ goalMin: 120, isRest: false }),
    ]);
    const weekly = await listWeeklyGoalVersions(db);
    expect(weekly.some((v) => v.effectiveFrom === '2026-10-19' && v.goalMin === 660)).toBe(true);
  });
});
