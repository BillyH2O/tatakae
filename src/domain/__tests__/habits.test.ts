import { asLocalDate as d } from '../time/localDate';
import {
  habitCalendarState,
  maskFromWeekdays,
  occurrenceDatesToEnsure,
  weekdaysFromMask,
} from '../habits';

describe('occurrenceDatesToEnsure', () => {
  const schedule = {
    weekdaysMask: maskFromWeekdays([1, 3, 5]),
    startLocalDate: d('2026-10-20'),
    archivedLocalDate: null,
    status: 'active' as const,
  };

  it('returns Mon/Wed/Fri between bounds', () => {
    // 2026-10-20 is Tuesday; Mon/Wed/Fri in range through 2026-10-26 are 21, 23, 26.
    expect(occurrenceDatesToEnsure(schedule, d('2026-10-20'), d('2026-10-26'))).toEqual([
      '2026-10-21',
      '2026-10-23',
      '2026-10-26',
    ]);
  });

  it('respects start and archive dates', () => {
    const archived = { ...schedule, archivedLocalDate: d('2026-10-22') };
    expect(occurrenceDatesToEnsure(archived, d('2026-10-19'), d('2026-10-30'))).toEqual([
      '2026-10-21',
    ]);
  });
});

describe('habitCalendarState', () => {
  const schedule = {
    weekdaysMask: maskFromWeekdays([4]),
    startLocalDate: d('2026-10-01'),
    archivedLocalDate: null,
    status: 'active' as const,
  };

  it('covers five states', () => {
    expect(habitCalendarState(d('2026-09-30'), schedule, null, d('2026-10-22'))).toBe('absent');
    expect(habitCalendarState(d('2026-10-21'), schedule, null, d('2026-10-22'))).toBe('rest');
    expect(habitCalendarState(d('2026-10-15'), schedule, { status: 'done' }, d('2026-10-22'))).toBe('done');
    expect(habitCalendarState(d('2026-10-08'), schedule, null, d('2026-10-22'))).toBe('missed');
    expect(habitCalendarState(d('2026-10-29'), schedule, null, d('2026-10-22'))).toBe('planned');
  });
});

describe('weekday mask', () => {
  it('round-trips ISO weekdays', () => {
    expect(weekdaysFromMask(maskFromWeekdays([1, 7]))).toEqual([1, 7]);
  });
});
