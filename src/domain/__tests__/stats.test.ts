import { PRODUCT } from '../../config/product';
import {
  heatmapGrid,
  heatmapRange,
  histogramBars,
  type GoalContext,
  hasAnyFocus,
  parsePeriod,
  periodKpis,
  periodRange,
  sessionBadges,
  shiftAnchor,
  weekGoalProgress,
  weeksOfPeriod,
} from '../stats';
import { addDays, asLocalDate as d, localInstant } from '../time/localDate';
import { splitIntervalsByLocalDay } from '../time/splitByDay';
import { buildFocusByDay } from '../totals';
import type { DailyGoalVersion } from '../types';

const MIN = 60_000;
const TODAY = d('2026-10-22'); // Thursday
const at = (date: string, hour: number, minute = 0) => localInstant(d(date), hour, minute);

const daily = (weekday: DailyGoalVersion['weekday'], goalMin: number | null, isRest = false): DailyGoalVersion => ({
  weekday,
  effectiveFrom: d('2026-08-01'),
  goalMin,
  isRest,
});
const goals: GoalContext = {
  profileStart: d('2026-08-01'),
  dailyGoals: [daily(1, 120), daily(2, 120), daily(3, 120), daily(4, 120), daily(5, 120), daily(6, 60), daily(7, null, true)],
  weeklyGoals: [{ effectiveFrom: d('2026-08-01'), goalMin: 660 }],
};

describe('periods', () => {
  it('week is Monday → Sunday, month is the calendar month', () => {
    expect(periodRange('week', TODAY)).toEqual({ period: 'week', from: d('2026-10-19'), to: d('2026-10-25') });
    expect(periodRange('month', TODAY)).toEqual({ period: 'month', from: d('2026-10-01'), to: d('2026-10-31') });
  });

  it('navigates by ±1 period, across months and years', () => {
    expect(shiftAnchor('week', TODAY, -1)).toBe(d('2026-10-18'));
    expect(shiftAnchor('week', TODAY, 1)).toBe(d('2026-10-26'));
    expect(periodRange('week', d('2026-10-26')).to).toBe(d('2026-11-01')); // ISO week spanning two months
    expect(shiftAnchor('month', TODAY, -1)).toBe(d('2026-09-30'));
    expect(shiftAnchor('month', d('2026-12-15'), 1)).toBe(d('2027-01-01'));
    expect(periodRange('month', d('2024-02-10')).to).toBe(d('2024-02-29'));
  });

  it('parsePeriod defaults to week', () => {
    expect(parsePeriod('month')).toBe('month');
    expect(parsePeriod('week')).toBe('week');
    expect(parsePeriod(undefined)).toBe('week');
    expect(parsePeriod('year')).toBe('week');
  });

  it('lists the weeks touching a month', () => {
    const weeks = weeksOfPeriod(periodRange('month', TODAY));
    expect(weeks[0]).toBe(d('2026-09-28'));
    expect(weeks).toHaveLength(5);
    expect(weeksOfPeriod(periodRange('week', TODAY))).toEqual([d('2026-10-19')]);
  });
});

describe('periodKpis', () => {
  const sessions = [
    { startedAt: at('2026-10-19', 9), focusedSec: 25 * 60 },
    { startedAt: at('2026-10-20', 9), focusedSec: 45 * 60 },
    { startedAt: at('2026-10-18', 23), focusedSec: 60 * 60 }, // previous week
  ];
  const byDay = buildFocusByDay([
    { localDate: d('2026-10-19'), focusedSec: 25 * 60 },
    { localDate: d('2026-10-20'), focusedSec: 45 * 60 },
  ]);

  it('counts by start day, averages those sessions and sums the day segments', () => {
    expect(periodKpis(periodRange('week', TODAY), byDay, sessions)).toEqual({
      focusSec: 70 * 60,
      sessionCount: 2,
      avgSessionSec: 35 * 60,
    });
  });

  it('empty period: zeros and no average', () => {
    expect(periodKpis(periodRange('month', d('2026-05-10')), byDay, sessions)).toEqual({
      focusSec: 0,
      sessionCount: 0,
      avgSessionSec: null,
    });
  });

  it('a session across two weeks is split in each week but counted once, in its start week', () => {
    // Sunday 25 Oct 23:30 → Monday 26 Oct 00:30 (an hour).
    const start = at('2026-10-25', 23, 30);
    const split = buildFocusByDay(splitIntervalsByLocalDay([{ start, end: start + 60 * MIN }]));
    const crossing = [{ startedAt: start, focusedSec: 3600 }];
    const week1 = periodKpis(periodRange('week', d('2026-10-25')), split, crossing);
    const week2 = periodKpis(periodRange('week', d('2026-10-26')), split, crossing);
    expect(week1.focusSec).toBe(30 * 60);
    expect(week2.focusSec).toBe(30 * 60);
    expect(week1.sessionCount + week2.sessionCount).toBe(1);
    expect(week1.sessionCount).toBe(1);
    expect(periodKpis(periodRange('month', d('2026-10-25')), split, crossing).focusSec).toBe(60 * 60);
    expect(periodKpis(periodRange('month', d('2026-11-02')), split, crossing).focusSec).toBe(0);
  });
});

describe('histogramBars', () => {
  it('one bar per day, future days empty, goal and rest per day', () => {
    const byDay = buildFocusByDay([{ localDate: d('2026-10-20'), focusedSec: 5400 }]);
    const bars = histogramBars(periodRange('week', TODAY), TODAY, byDay, goals);
    expect(bars).toHaveLength(7);
    expect(bars[1]).toMatchObject({ date: d('2026-10-20'), focusSec: 5400, goalMin: 120, rest: false });
    expect(bars[0]?.focusSec).toBe(0); // past day without session
    expect(bars[3]?.focusSec).toBe(0); // today
    expect(bars[4]?.focusSec).toBeNull(); // future
    expect(bars[5]).toMatchObject({ goalMin: 60, focusSec: null });
    expect(bars[6]).toMatchObject({ rest: true, goalMin: null });
    expect(hasAnyFocus(bars)).toBe(true);
  });

  it('a month without data has bars but no focus', () => {
    const bars = histogramBars(periodRange('month', d('2026-09-10')), TODAY, buildFocusByDay([]), goals);
    expect(bars).toHaveLength(30);
    expect(hasAnyFocus(bars)).toBe(false);
  });
});

describe('weekGoalProgress', () => {
  it('percent floors and is capped at 100; null without goal', () => {
    const byDay = buildFocusByDay([{ localDate: d('2026-10-19'), focusedSec: 330 * 60 + 59 }]);
    expect(weekGoalProgress(d('2026-10-19'), byDay, goals)).toMatchObject({ goalMin: 660, percent: 50 });
    const big = buildFocusByDay([{ localDate: d('2026-10-19'), focusedSec: 20 * 3600 }]);
    expect(weekGoalProgress(d('2026-10-19'), big, goals).percent).toBe(100);
    expect(weekGoalProgress(d('2026-10-19'), big, { ...goals, weeklyGoals: [] })).toMatchObject({ goalMin: null, percent: null });
  });
});

describe('heatmap', () => {
  const byDay = buildFocusByDay([
    { localDate: d('2026-10-21'), focusedSec: 60 * 60 },
    { localDate: d('2026-10-20'), focusedSec: 125 * 60 },
    { localDate: TODAY, focusedSec: 30 * 60 },
  ]);

  it('covers the last 18 weeks, Monday to Sunday, ending with the current week', () => {
    const grid = heatmapGrid(TODAY, byDay, goals);
    expect(grid).toHaveLength(PRODUCT.stats.heatmapWeeks);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid[0]![0]!.date).toBe(heatmapRange(TODAY).from);
    expect(grid.at(-1)![0]!.date).toBe(d('2026-10-19'));
    expect(grid.at(-1)![6]!.date).toBe(d('2026-10-25'));
  });

  it('uses the same states and buckets as the calendar', () => {
    const week = heatmapGrid(TODAY, byDay, goals).at(-1)!;
    expect(week[0]!.state).toEqual({ kind: 'past', score: 0 });
    expect(week[0]!.bucket).toBe('low'); // past day with a goal and no session
    expect(week[1]!.bucket).toBe('full'); // 125 / 120
    expect(week[2]!.bucket).toBe('mid'); // 60 / 120 = 50
    expect(week[3]!.state.kind).toBe('today');
    expect(week[3]!.bucket).toBe('low'); // 30 / 120 = 25
    expect(week[4]!).toMatchObject({ state: { kind: 'future' }, bucket: null });
    expect(week[6]!).toMatchObject({ state: { kind: 'rest' }, bucket: null });
  });

  it('days before the profile start have no goal', () => {
    const grid = heatmapGrid(TODAY, byDay, { ...goals, profileStart: addDays(TODAY, -3) });
    expect(grid[0]![0]!.state).toEqual({ kind: 'noGoal' });
  });
});

describe('sessionBadges', () => {
  const base = { source: 'timer' as const, mode: 'countdown' as const, status: 'completed', isCorrected: false };
  it('maps manual / corrected / free timer / stopped early', () => {
    expect(sessionBadges(base)).toEqual([]);
    expect(sessionBadges({ ...base, source: 'manual', mode: null })).toEqual(['manual']);
    expect(sessionBadges({ ...base, isCorrected: true })).toEqual(['corrected']);
    expect(sessionBadges({ ...base, mode: 'stopwatch' })).toEqual(['stopwatch']);
    expect(sessionBadges({ ...base, status: 'stopped', isCorrected: true })).toEqual(['corrected', 'stoppedEarly']);
  });
});
