import { habitRegularity, habitRegularityGrid, maskFromWeekdays } from '../habits';
import { asLocalDate as d } from '../time/localDate';

const TODAY = d('2026-10-22'); // Thursday

const everyDay = {
  weekdaysMask: maskFromWeekdays([1, 2, 3, 4, 5, 6, 7]),
  startLocalDate: d('2026-10-14'),
  archivedLocalDate: null,
  status: 'active' as const,
};

const done = (...dates: string[]) => dates.map((date) => ({ localDate: d(date), status: 'done' as const }));

describe('habitRegularityGrid', () => {
  it('builds Monday-first columns ending with the current week', () => {
    const grid = habitRegularityGrid(everyDay, [], TODAY, 2);
    expect(grid).toHaveLength(2);
    expect(grid.every((column) => column.length === 7)).toBe(true);
    expect(grid[0]?.[0]?.date).toBe('2026-10-12');
    expect(grid[1]?.[6]?.date).toBe('2026-10-25');
  });

  it('maps each day to done / missed / pending / upcoming / absent', () => {
    const grid = habitRegularityGrid(everyDay, done('2026-10-14', '2026-10-15'), TODAY, 2);
    const states = grid.flat().map((cell) => cell.state);
    expect(states).toEqual([
      'absent', // Mon 12 (before the habit)
      'absent', // Tue 13
      'done', // Wed 14
      'done', // Thu 15
      'missed', // Fri 16
      'missed', // Sat 17
      'missed', // Sun 18
      'missed', // Mon 19
      'missed', // Tue 20
      'missed', // Wed 21
      'pending', // Thu 22 = today
      'upcoming', // Fri 23
      'upcoming',
      'upcoming',
    ]);
  });

  it('marks non-planned weekdays as rest and days after archiving as absent', () => {
    const thursdays = { ...everyDay, weekdaysMask: maskFromWeekdays([4]), archivedLocalDate: d('2026-10-20'), status: 'archived' as const };
    const states = habitRegularityGrid(thursdays, [], TODAY, 2).flat().map((cell) => cell.state);
    expect(states[3]).toBe('missed'); // Thu 15: planned, not done
    expect(states[4]).toBe('rest'); // Fri 16: not a habit day
    expect(states[10]).toBe('absent'); // Thu 22: after the habit was archived
  });

  it('shows a done habit today as done', () => {
    const cell = habitRegularityGrid(everyDay, done('2026-10-22'), TODAY, 1).flat().find((c) => c.date === TODAY);
    expect(cell?.state).toBe('done');
  });
});

describe('habitRegularity', () => {
  const grid = habitRegularityGrid(everyDay, done('2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21'), TODAY, 2);

  it('counts done and planned days up to today, an unfinished today is not a miss', () => {
    const result = habitRegularity(grid);
    expect(result.done).toBe(6);
    expect(result.planned).toBe(8);
    expect(result.ratePercent).toBe(75);
  });

  it('computes the current and best streak; a pending today keeps the streak alive', () => {
    const result = habitRegularity(grid);
    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
  });

  it('extends the streak once today is done and resets it on a miss', () => {
    const withToday = habitRegularityGrid(everyDay, done('2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'), TODAY, 2);
    expect(habitRegularity(withToday).currentStreak).toBe(4);
    const missedYesterday = habitRegularityGrid(everyDay, done('2026-10-19', '2026-10-20', '2026-10-22'), TODAY, 2);
    expect(habitRegularity(missedYesterday).currentStreak).toBe(1);
  });

  it('has no rate before any planned day', () => {
    const empty = habitRegularity(habitRegularityGrid({ ...everyDay, startLocalDate: d('2026-10-30') }, [], TODAY, 2));
    expect(empty).toEqual({ done: 0, planned: 0, ratePercent: null, currentStreak: 0, bestStreak: 0 });
  });
});
