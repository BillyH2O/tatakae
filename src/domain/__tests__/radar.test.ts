import { computeRadar, radarWindowStart, type RadarAxisResult, type RadarSession } from '../radar';
import { buildFocusByDay } from '../totals';
import type { DailyGoalVersion, LocalDate, StopReason } from '../types';

const d = (value: string) => value as LocalDate;
const TODAY = d('2026-10-22'); // Thursday
const MIN = 60;

// Every weekday 60 min except Sunday = rest, effective before the window.
const goals: DailyGoalVersion[] = ([1, 2, 3, 4, 5, 6, 7] as const).map((weekday) => ({
  weekday,
  effectiveFrom: d('2026-09-01'),
  goalMin: weekday === 7 ? null : 60,
  isRest: weekday === 7,
}));

const at = (date: string, hour = 12) => {
  const [y, m, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, day, hour).getTime();
};

function session(partial: Partial<RadarSession> & { date?: string } = {}): RadarSession {
  const { date = '2026-10-20', ...rest } = partial;
  return {
    endedAt: at(date),
    status: 'completed',
    source: 'timer',
    mode: 'countdown',
    isCorrected: false,
    stopReason: null,
    rating: null,
    ...rest,
  };
}

function radar(
  sessions: RadarSession[],
  focus: Record<string, number> = {},
  options: { profileStart?: LocalDate | null } = {},
): Record<RadarAxisResult['axis'], RadarAxisResult> {
  const byDay = buildFocusByDay(Object.entries(focus).map(([localDate, minutes]) => ({ localDate: d(localDate), focusedSec: minutes * MIN })));
  const profileStart = options.profileStart === undefined ? d('2026-09-01') : options.profileStart;
  const axes = computeRadar({ today: TODAY, sessions, byDay, dailyGoals: goals, profileStart });
  return Object.fromEntries(axes.map((axis) => [axis.axis, axis])) as Record<RadarAxisResult['axis'], RadarAxisResult>;
}

describe('window', () => {
  it('is the 14 days ending today', () => {
    expect(radarWindowStart(TODAY)).toBe('2026-10-09');
  });
});

describe('strength', () => {
  it('needs 3 rated sessions: 2 ratings is "not enough data", never 0', () => {
    const result = radar([session({ rating: 5 }), session({ rating: 4 }), session()]).strength;
    expect(result.status).toBe('insufficient');
    expect(result.value).toBeNull();
    expect(result.detail).toEqual({ axis: 'strength', rated: 2, required: 3 });
  });

  it('averages ratings × 20; unrated sessions are ignored', () => {
    const result = radar([session({ rating: 5 }), session({ rating: 4 }), session({ rating: 3 }), session()]).strength;
    expect(result.status).toBe('ok');
    expect(result.value).toBe(80);
  });

  it('ignores sessions that ended outside the window', () => {
    const old = [1, 2, 3].map(() => session({ date: '2026-10-08', rating: 5 }));
    expect(radar(old).strength.status).toBe('insufficient');
    const edge = [1, 2, 3].map(() => session({ date: '2026-10-09', rating: 5 }));
    expect(radar(edge).strength.value).toBe(100);
  });

  it('ignores discarded sessions', () => {
    const discarded = [1, 2, 3].map(() => session({ status: 'discarded', rating: 5 }));
    expect(radar(discarded).strength.status).toBe('insufficient');
  });
});

describe('endurance', () => {
  it('is focus on goal days over the sum of their goals, today flagged in progress', () => {
    // Window Oct 9..22 has 2 Sundays (11, 18) as rest → 12 goal days × 60 = 720 min.
    const result = radar([], { '2026-10-20': 360, '2026-10-22': 0 }).endurance;
    expect(result.status).toBe('ok');
    expect(result.value).toBe(50);
    expect(result.inProgress).toBe(true);
    expect(result.detail).toEqual({ axis: 'endurance', focusMin: 360, goalMin: 720, goalDays: 12 });
  });

  it('caps at 100 and excludes focus done on rest days', () => {
    const result = radar([], { '2026-10-18': 600, '2026-10-20': 5000 }).endurance;
    expect(result.value).toBe(100);
    expect(result.detail).toMatchObject({ focusMin: 5000 });
  });

  it('is insufficient without any goal day (before onboarding / no goals)', () => {
    const result = radar([], { '2026-10-20': 60 }, { profileStart: null }).endurance;
    expect(result.status).toBe('insufficient');
    expect(result.value).toBeNull();
  });

  it('only counts days from the profile start', () => {
    const result = radar([], { '2026-10-22': 30 }, { profileStart: d('2026-10-22') }).endurance;
    expect(result.detail).toMatchObject({ goalDays: 1, goalMin: 60, focusMin: 30 });
    expect(result.value).toBe(50);
  });
});

describe('mental', () => {
  it('is completed / closed countdowns, keeping the stop reasons', () => {
    const stopped = (stopReason: StopReason) => session({ status: 'stopped', stopReason });
    const result = radar([session(), session(), stopped('tired'), stopped('interrupted')]).mental;
    expect(result.value).toBe(50);
    expect(result.detail).toEqual({
      axis: 'mental',
      completed: 2,
      stopped: 2,
      stopReasons: { tired: 1, interrupted: 1 },
    });
  });

  it('excludes stopwatches, manual entries and corrected sessions', () => {
    const result = radar([
      session({ mode: 'stopwatch', status: 'stopped' }),
      session({ source: 'manual', mode: null, status: 'stopped' }),
      session({ isCorrected: true, status: 'stopped' }),
      session(),
    ]).mental;
    expect(result.value).toBe(100);
    expect(result.detail).toMatchObject({ completed: 1, stopped: 0 });
  });

  it('is insufficient without a closed countdown, never 0', () => {
    expect(radar([session({ mode: 'stopwatch' })]).mental.value).toBeNull();
    expect(radar([session({ status: 'discarded' })]).mental.status).toBe('insufficient');
    expect(radar([]).mental.status).toBe('insufficient');
  });
});

describe('consistency', () => {
  it('counts past goal days that reached their goal; today is excluded until tomorrow', () => {
    // Past goal days: Oct 9..21 minus Sundays 11, 18 = 11 days.
    const result = radar([], { '2026-10-20': 60, '2026-10-21': 59, '2026-10-22': 600 }).consistency;
    expect(result.detail).toEqual({ axis: 'consistency', achieved: 1, planned: 11 });
    expect(result.value).toBeCloseTo((1 / 11) * 100, 6);
    expect(result.inProgress).toBe(false);
  });

  it('rest days never count, even with focus', () => {
    const result = radar([], { '2026-10-18': 600 }).consistency;
    expect(result.detail).toMatchObject({ achieved: 0, planned: 11 });
  });

  it('is insufficient with no past goal day', () => {
    const result = radar([], { '2026-10-22': 600 }, { profileStart: TODAY }).consistency;
    expect(result.status).toBe('insufficient');
    expect(result.value).toBeNull();
  });

  it('a goal change keeps the old goal for past days', () => {
    const changed: DailyGoalVersion[] = [
      ...goals,
      { weekday: 2, effectiveFrom: d('2026-10-21'), goalMin: 10, isRest: false },
    ];
    const byDay = buildFocusByDay([{ localDate: d('2026-10-13'), focusedSec: 30 * MIN }]);
    const axes = computeRadar({ today: TODAY, sessions: [], byDay, dailyGoals: changed, profileStart: d('2026-09-01') });
    const consistency = axes.find((axis) => axis.axis === 'consistency');
    // Oct 13 is a Tuesday before the change: its goal is still 60, 30 min does not reach it.
    expect(consistency?.detail).toMatchObject({ achieved: 0 });
  });
});
