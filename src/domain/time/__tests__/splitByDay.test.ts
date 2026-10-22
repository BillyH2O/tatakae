import { splitIntervalsByLocalDay } from '../splitByDay';

const at = (y: number, m: number, day: number, h: number, min = 0, s = 0) =>
  new Date(y, m - 1, day, h, min, s).getTime();

describe('splitIntervalsByLocalDay', () => {
  it('keeps a same-day interval on one day', () => {
    expect(splitIntervalsByLocalDay([{ start: at(2026, 10, 22, 9), end: at(2026, 10, 22, 9, 25) }])).toEqual([
      { localDate: '2026-10-22', focusedSec: 1500 },
    ]);
  });

  it('splits an interval crossing midnight (23:40 → 00:20 = 20 + 20 min)', () => {
    expect(splitIntervalsByLocalDay([{ start: at(2026, 10, 22, 23, 40), end: at(2026, 10, 23, 0, 20) }])).toEqual([
      { localDate: '2026-10-22', focusedSec: 1200 },
      { localDate: '2026-10-23', focusedSec: 1200 },
    ]);
  });

  it('splits 23:50 → 00:15 into 10 and 15 minutes', () => {
    expect(splitIntervalsByLocalDay([{ start: at(2026, 10, 22, 23, 50), end: at(2026, 10, 23, 0, 15) }])).toEqual([
      { localDate: '2026-10-22', focusedSec: 600 },
      { localDate: '2026-10-23', focusedSec: 900 },
    ]);
  });

  it('counts real elapsed time over the spring DST change (01:30 → 03:30 local = 60 min)', () => {
    const [segment, ...rest] = splitIntervalsByLocalDay([
      { start: at(2026, 3, 29, 1, 30), end: at(2026, 3, 29, 3, 30) },
    ]);
    expect(rest).toEqual([]);
    expect(segment).toEqual({ localDate: '2026-03-29', focusedSec: 3600 });
  });

  it('counts real elapsed time over the autumn DST change (01:30 → 03:30 local = 180 min)', () => {
    const [segment, ...rest] = splitIntervalsByLocalDay([
      { start: at(2026, 10, 25, 1, 30), end: at(2026, 10, 25, 3, 30) },
    ]);
    expect(rest).toEqual([]);
    expect(segment).toEqual({ localDate: '2026-10-25', focusedSec: 10_800 });
  });

  it('splits Sunday night into Sunday and Monday (week change)', () => {
    const result = splitIntervalsByLocalDay([{ start: at(2026, 10, 25, 23, 50), end: at(2026, 10, 26, 0, 10) }]);
    expect(result).toEqual([
      { localDate: '2026-10-25', focusedSec: 600 },
      { localDate: '2026-10-26', focusedSec: 600 },
    ]);
  });

  it('handles a pause straddling midnight (two intervals around the pause)', () => {
    const result = splitIntervalsByLocalDay([
      { start: at(2026, 10, 22, 23, 40), end: at(2026, 10, 22, 23, 55) },
      { start: at(2026, 10, 23, 0, 5), end: at(2026, 10, 23, 0, 20) },
    ]);
    expect(result).toEqual([
      { localDate: '2026-10-22', focusedSec: 900 },
      { localDate: '2026-10-23', focusedSec: 900 },
    ]);
  });

  it('spreads very long intervals over several days', () => {
    const result = splitIntervalsByLocalDay([{ start: at(2026, 10, 22, 22), end: at(2026, 10, 24, 2) }]);
    expect(result.map((r) => r.focusedSec)).toEqual([2 * 3600, 24 * 3600, 2 * 3600]);
  });

  it('floors on the running total so the sum equals floor(total)', () => {
    const start = at(2026, 10, 22, 23, 59, 59) + 500; // 23:59:59.500
    const end = start + 1500; // 00:00:01.000 → 500 ms on day 1, 1 000 ms on day 2
    expect(splitIntervalsByLocalDay([{ start, end }])).toEqual([{ localDate: '2026-10-23', focusedSec: 1 }]);
  });

  it('keeps the total exact across many fractional intervals', () => {
    const base = at(2026, 10, 22, 10);
    const intervals = Array.from({ length: 10 }, (_, i) => ({
      start: base + i * 10_000,
      end: base + i * 10_000 + 1_300,
    }));
    const sum = splitIntervalsByLocalDay(intervals).reduce((acc, r) => acc + r.focusedSec, 0);
    expect(sum).toBe(Math.floor((10 * 1300) / 1000));
  });

  it('ignores empty and inverted intervals', () => {
    const t = at(2026, 10, 22, 10);
    expect(splitIntervalsByLocalDay([{ start: t, end: t }, { start: t + 10, end: t }])).toEqual([]);
  });
});
