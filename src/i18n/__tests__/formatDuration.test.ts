import { formatDuration } from '../en';

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
