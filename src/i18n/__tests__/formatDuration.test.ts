import { formatClock, formatDuration, formatTimeOfDay } from '../en';

describe('formatClock', () => {
  it.each([
    [0, '00:00'],
    [5, '00:05'],
    [245, '04:05'],
    [25 * 60, '25:00'],
    [3600, '1:00:00'],
    [3723, '1:02:03'],
    [-4, '00:00'],
  ])('%d s → %s', (sec, expected) => {
    expect(formatClock(sec)).toBe(expected);
  });
});

describe('formatTimeOfDay', () => {
  it('prints the local time as HH:MM', () => {
    expect(formatTimeOfDay(new Date(2026, 9, 22, 14, 5, 59).getTime())).toBe('14:05');
    expect(formatTimeOfDay(new Date(2026, 9, 22, 0, 7).getTime())).toBe('00:07');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 min'],
    [59, '0 min'],
    [60, '1 min'],
    [25 * 60, '25 min'],
    [59 * 60 + 59, '59 min'],
    [3600, '1 h'],
    [2 * 3600, '2 h'],
    [3600 + 5 * 60, '1 h 05'],
    [3600 + 45 * 60, '1 h 45'],
    [11 * 3600, '11 h'],
    [-30, '0 min'],
  ])('%d s → %s', (sec, expected) => {
    expect(formatDuration(sec)).toBe(expected);
  });
});
