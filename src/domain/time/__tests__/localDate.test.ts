import {
  addDays,
  asLocalDate,
  daysBetween,
  isFuture,
  isoWeekday,
  monthDays,
  monthRange,
  msUntilNextLocalMidnight,
  startOfLocalDay,
  startOfNextLocalDay,
  toLocalDate,
  weekDays,
  weekStart,
} from '../localDate';

const d = asLocalDate;

describe('asLocalDate', () => {
  it('accepts real calendar days only', () => {
    expect(d('2026-02-28')).toBe('2026-02-28');
    expect(() => d('2026-02-30')).toThrow();
    expect(() => d('2026-2-3')).toThrow();
    expect(() => d('not-a-date')).toThrow();
  });
});

describe('addDays', () => {
  it('is calendar arithmetic across the March DST change', () => {
    expect(addDays(d('2026-03-28'), 1)).toBe('2026-03-29');
    expect(addDays(d('2026-03-29'), 1)).toBe('2026-03-30');
    expect(addDays(d('2026-03-30'), -2)).toBe('2026-03-28');
  });

  it('is calendar arithmetic across the October DST change', () => {
    expect(addDays(d('2026-10-24'), 1)).toBe('2026-10-25');
    expect(addDays(d('2026-10-25'), 1)).toBe('2026-10-26');
    expect(addDays(d('2026-10-26'), -1)).toBe('2026-10-25');
  });

  it('crosses month and year boundaries and leap days', () => {
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(d('2028-02-28'), 1)).toBe('2028-02-29');
    expect(addDays(d('2026-01-01'), -1)).toBe('2025-12-31');
    expect(addDays(d('2026-10-22'), 365)).toBe('2027-10-22');
  });
});

describe('daysBetween', () => {
  it('counts calendar days regardless of DST', () => {
    expect(daysBetween(d('2026-10-24'), d('2026-10-26'))).toBe(2);
    expect(daysBetween(d('2026-03-28'), d('2026-03-30'))).toBe(2);
    expect(daysBetween(d('2026-10-26'), d('2026-10-24'))).toBe(-2);
  });
});

describe('isoWeekday', () => {
  it('maps Monday to 1 and Sunday to 7', () => {
    expect(isoWeekday(d('2026-10-19'))).toBe(1);
    expect(isoWeekday(d('2026-10-22'))).toBe(4);
    expect(isoWeekday(d('2026-10-25'))).toBe(7);
  });
});

describe('weekStart / weekDays', () => {
  it('maps Sunday to the previous Monday', () => {
    expect(weekStart(d('2026-10-25'))).toBe('2026-10-19');
    expect(weekStart(d('2026-10-19'))).toBe('2026-10-19');
    expect(weekStart(d('2026-10-22'))).toBe('2026-10-19');
  });

  it('lists Monday to Sunday', () => {
    expect(weekDays(d('2026-10-22'))).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });

  it('handles a week spanning two months and two years', () => {
    expect(weekDays(d('2026-10-30'))[6]).toBe('2026-11-01');
    expect(weekStart(d('2027-01-01'))).toBe('2026-12-28');
  });
});

describe('monthRange / monthDays', () => {
  it('returns the first and last day', () => {
    expect(monthRange(d('2026-02-14'))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthRange(d('2028-02-14'))).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthDays(d('2026-10-22'))).toHaveLength(31);
  });
});

describe('local day boundaries (Europe/Paris)', () => {
  it('toLocalDate uses the local calendar day', () => {
    expect(toLocalDate(new Date(2026, 9, 22, 23, 59, 59).getTime())).toBe('2026-10-22');
    expect(toLocalDate(new Date(2026, 9, 23, 0, 0, 0).getTime())).toBe('2026-10-23');
  });

  it('days of DST change last 23 h and 25 h', () => {
    const hours = (day: string) =>
      (startOfNextLocalDay(d(day)) - startOfLocalDay(d(day))) / 3_600_000;
    expect(hours('2026-03-29')).toBe(23);
    expect(hours('2026-10-25')).toBe(25);
    expect(hours('2026-10-22')).toBe(24);
  });

  it('msUntilNextLocalMidnight is positive and DST-aware', () => {
    const at2330 = new Date(2026, 9, 22, 23, 30).getTime();
    expect(msUntilNextLocalMidnight(at2330)).toBe(30 * 60_000);
    const dstDay = new Date(2026, 9, 25, 1, 30).getTime(); // 01:30 CEST, 1.5 h into a 25 h day
    expect(msUntilNextLocalMidnight(dstDay)).toBe(23.5 * 3_600_000);
  });
});

describe('isFuture', () => {
  it('compares days', () => {
    expect(isFuture(d('2026-10-23'), d('2026-10-22'))).toBe(true);
    expect(isFuture(d('2026-10-22'), d('2026-10-22'))).toBe(false);
  });
});
