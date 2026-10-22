import { PRODUCT } from '../../config/product';
import { defaultWeeklyGoalMin, resolveDayGoal, resolveWeekGoal } from '../goals';
import { asLocalDate as d } from '../time/localDate';
import type { DailyGoalVersion, WeeklyGoalVersion } from '../types';

const v = (weekday: DailyGoalVersion['weekday'], from: string, goalMin: number | null, isRest = false): DailyGoalVersion => ({
  weekday,
  effectiveFrom: d(from),
  goalMin,
  isRest,
});

const start = d('2026-10-01');

describe('resolveDayGoal', () => {
  const thursday = d('2026-10-22');

  it('uses the latest version effective on or before the date for that weekday', () => {
    const versions = [v(4, '2026-10-01', 120), v(4, '2026-10-15', 90), v(4, '2026-11-05', 30)];
    expect(resolveDayGoal(d('2026-10-08'), versions, start)).toEqual({ kind: 'goal', minutes: 120 });
    expect(resolveDayGoal(thursday, versions, start)).toEqual({ kind: 'goal', minutes: 90 });
  });

  it('ignores versions of other weekdays', () => {
    expect(resolveDayGoal(thursday, [v(3, '2026-10-01', 45)], start)).toEqual({ kind: 'none' });
  });

  it('returns none before the profile start date', () => {
    expect(resolveDayGoal(d('2026-09-30'), [v(3, '2026-09-01', 45)], start)).toEqual({ kind: 'none' });
  });

  it('returns rest for a planned rest day and none when no goal is set', () => {
    expect(resolveDayGoal(d('2026-10-25'), [v(7, '2026-10-01', null, true)], start)).toEqual({ kind: 'rest' });
    expect(resolveDayGoal(thursday, [v(4, '2026-10-01', null)], start)).toEqual({ kind: 'none' });
  });

  it('a goal changed today does not rewrite yesterday (same weekday, a week earlier)', () => {
    const today = d('2026-10-22');
    const lastThursday = d('2026-10-15');
    const versions = [v(4, '2026-10-01', 120), v(4, today, 60)];
    expect(resolveDayGoal(lastThursday, versions, start)).toEqual({ kind: 'goal', minutes: 120 });
    expect(resolveDayGoal(today, versions, start)).toEqual({ kind: 'goal', minutes: 60 });
  });

  it('a rest day added later does not turn past days into rest days', () => {
    const versions = [v(7, '2026-10-01', 60), v(7, '2026-10-20', null, true)];
    expect(resolveDayGoal(d('2026-10-18'), versions, start)).toEqual({ kind: 'goal', minutes: 60 });
    expect(resolveDayGoal(d('2026-10-25'), versions, start)).toEqual({ kind: 'rest' });
  });
});

describe('resolveWeekGoal', () => {
  const weekly: WeeklyGoalVersion[] = [
    { effectiveFrom: d('2026-10-05'), goalMin: 600 },
    { effectiveFrom: d('2026-10-19'), goalMin: 660 },
  ];

  it('picks the version in force for the week', () => {
    expect(resolveWeekGoal(d('2026-10-12'), weekly)).toBe(600);
    expect(resolveWeekGoal(d('2026-10-19'), weekly)).toBe(660);
  });

  it('returns null before any version or when the goal is cleared', () => {
    expect(resolveWeekGoal(d('2026-09-28'), weekly)).toBeNull();
    expect(resolveWeekGoal(d('2026-11-02'), [...weekly, { effectiveFrom: d('2026-11-02'), goalMin: null }])).toBeNull();
  });
});

describe('defaultWeeklyGoalMin', () => {
  it('is the sum of the default daily goals (rest days excluded)', () => {
    expect(defaultWeeklyGoalMin()).toBe(660);
    expect(PRODUCT.goals.defaultDailyMin[7]).toBe('rest');
  });
});
