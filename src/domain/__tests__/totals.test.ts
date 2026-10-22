import { buildFocusByDay, goalProgress, headerTotals, sumFocusRange, weekRange } from '../totals';
import type { DailyGoalVersion, LocalDate, WeeklyGoalVersion } from '../types';

const d = (value: string) => value as LocalDate;

// 2026-10-22 is a Thursday; its ISO week is 2026-10-19 → 2026-10-25.
const TODAY = d('2026-10-22');

const daily: DailyGoalVersion[] = [
  { weekday: 4, effectiveFrom: d('2026-10-01'), goalMin: 120, isRest: false },
  { weekday: 7, effectiveFrom: d('2026-10-01'), goalMin: null, isRest: true },
];
const weekly: WeeklyGoalVersion[] = [{ effectiveFrom: d('2026-09-28'), goalMin: 660 }];

describe('buildFocusByDay / sumFocusRange', () => {
  it('sums duplicate days and ranges inclusively', () => {
    const byDay = buildFocusByDay([
      { localDate: d('2026-10-18'), focusedSec: 600 },
      { localDate: d('2026-10-19'), focusedSec: 300 },
      { localDate: d('2026-10-19'), focusedSec: 60 },
      { localDate: d('2026-10-25'), focusedSec: 120 },
      { localDate: d('2026-10-26'), focusedSec: 999 },
    ]);
    expect(byDay.get(d('2026-10-19'))).toBe(360);
    expect(sumFocusRange(byDay, d('2026-10-19'), d('2026-10-25'))).toBe(480);
    expect(sumFocusRange(byDay, d('2026-10-20'), d('2026-10-20'))).toBe(0);
  });

  it('crosses month boundaries day by day', () => {
    const byDay = buildFocusByDay([
      { localDate: d('2026-10-31'), focusedSec: 60 },
      { localDate: d('2026-11-01'), focusedSec: 60 },
    ]);
    expect(sumFocusRange(byDay, d('2026-10-30'), d('2026-11-02'))).toBe(120);
  });
});

describe('buildFocusByDay with a live session', () => {
  const MIN = 60_000;

  it('adds the focus so far of the active session, excluding pauses', () => {
    const start = new Date(2026, 9, 22, 10, 0, 0).getTime();
    const byDay = buildFocusByDay([{ localDate: TODAY, focusedSec: 600 }], {
      session: { mode: 'stopwatch', plannedSec: null, startedAt: start },
      pauses: [{ startedAt: start + 10 * MIN, endedAt: start + 15 * MIN }],
      now: start + 25 * MIN,
    });
    expect(byDay.get(TODAY)).toBe(600 + 20 * 60);
  });

  it('keeps counting across midnight: "Today" restarts at 0 plus the live part', () => {
    const start = new Date(2026, 9, 22, 23, 50, 0).getTime();
    const byDay = buildFocusByDay([{ localDate: TODAY, focusedSec: 3600 }], {
      session: { mode: 'countdown', plannedSec: 25 * 60, startedAt: start },
      pauses: [],
      now: start + 15 * MIN,
    });
    expect(byDay.get(TODAY)).toBe(3600 + 600);
    expect(byDay.get(d('2026-10-23'))).toBe(300);
  });

  it('is unchanged without a live session', () => {
    expect(buildFocusByDay([{ localDate: TODAY, focusedSec: 60 }], null).get(TODAY)).toBe(60);
  });

  it('does not exceed the planned time of a countdown', () => {
    const start = new Date(2026, 9, 22, 10, 0, 0).getTime();
    const byDay = buildFocusByDay([], {
      session: { mode: 'countdown', plannedSec: 25 * 60, startedAt: start },
      pauses: [],
      now: start + 90 * MIN,
    });
    expect(byDay.get(TODAY)).toBe(1500);
  });
});

describe('weekRange', () => {
  it('is Monday to Sunday, including when today is Sunday', () => {
    expect(weekRange(TODAY)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(weekRange(d('2026-10-25'))).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(weekRange(d('2026-10-26'))).toEqual({ from: '2026-10-26', to: '2026-11-01' });
  });
});

describe('headerTotals', () => {
  const byDay = buildFocusByDay([
    { localDate: d('2026-10-18'), focusedSec: 3600 }, // previous week, excluded
    { localDate: d('2026-10-20'), focusedSec: 1800 },
    { localDate: TODAY, focusedSec: 6300 },
  ]);

  it('uses the real day and week with goals in force', () => {
    expect(
      headerTotals({ today: TODAY, byDay, profileStart: d('2026-10-01'), dailyGoals: daily, weeklyGoals: weekly }),
    ).toEqual({ today: { focusSec: 6300, goalMin: 120 }, week: { focusSec: 8100, goalMin: 660 } });
  });

  it('has no daily goal on a rest day, nor before the first day of use', () => {
    const sunday = headerTotals({
      today: d('2026-10-25'),
      byDay,
      profileStart: d('2026-10-01'),
      dailyGoals: daily,
      weeklyGoals: weekly,
    });
    expect(sunday.today.goalMin).toBeNull();

    const beforeStart = headerTotals({ today: TODAY, byDay, profileStart: d('2026-10-23'), dailyGoals: daily, weeklyGoals: weekly });
    expect(beforeStart.today.goalMin).toBeNull();
  });

  it('shows focus without any goal when there is no profile yet', () => {
    expect(headerTotals({ today: TODAY, byDay, profileStart: null, dailyGoals: daily, weeklyGoals: weekly })).toEqual({
      today: { focusSec: 6300, goalMin: null },
      week: { focusSec: 8100, goalMin: null },
    });
  });

  it('is zero for an empty database', () => {
    expect(
      headerTotals({ today: TODAY, byDay: buildFocusByDay([]), profileStart: null, dailyGoals: [], weeklyGoals: [] }),
    ).toEqual({ today: { focusSec: 0, goalMin: null }, week: { focusSec: 0, goalMin: null } });
  });
});

describe('goalProgress', () => {
  it('is null without a goal and capped at 1', () => {
    expect(goalProgress({ focusSec: 600, goalMin: null })).toBeNull();
    expect(goalProgress({ focusSec: 3600, goalMin: 120 })).toBe(0.5);
    expect(goalProgress({ focusSec: 99_999, goalMin: 120 })).toBe(1);
    expect(goalProgress({ focusSec: 0, goalMin: 120 })).toBe(0);
  });
});
