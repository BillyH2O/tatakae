import { maskFromWeekdays } from '../habits';
import { habitReminderKey, isoToExpoWeekday, parseReminderTime, planHabitReminders } from '../notifications';
import { asLocalDate } from '../time/localDate';
import type { Habit, IsoWeekday } from '../types';

function habit(partial: Partial<Habit> & { id: string }): Habit {
  return {
    title: partial.id,
    color: '#4C9BFF',
    icon: 'repeat',
    categoryId: null,
    weekdaysMask: maskFromWeekdays([1, 3, 5]),
    reminderTime: '08:30',
    status: 'active',
    startLocalDate: asLocalDate('2026-10-01'),
    archivedLocalDate: null,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe('isoToExpoWeekday', () => {
  it('maps ISO Monday..Sunday to expo 2..7,1', () => {
    const expected: Record<IsoWeekday, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 1 };
    for (const iso of [1, 2, 3, 4, 5, 6, 7] as const) expect(isoToExpoWeekday(iso)).toBe(expected[iso]);
  });
});

describe('parseReminderTime', () => {
  it('parses valid 24 h times', () => {
    expect(parseReminderTime('08:05')).toEqual({ hour: 8, minute: 5 });
    expect(parseReminderTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseReminderTime('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  it('rejects anything else', () => {
    for (const value of ['24:00', '8:30', '12:60', '12-30', '', 'abc']) {
      expect(parseReminderTime(value)).toBeNull();
    }
    expect(parseReminderTime(null)).toBeNull();
  });
});

describe('planHabitReminders', () => {
  it('creates one weekly slot per planned weekday with the expo weekday', () => {
    const plan = planHabitReminders([habit({ id: 'a' })], 50);
    expect(plan.skipped).toBe(0);
    expect(plan.slots.map((slot) => [slot.key, slot.expoWeekday, slot.hour, slot.minute])).toEqual([
      [habitReminderKey('a', 1), 2, 8, 30],
      [habitReminderKey('a', 3), 4, 8, 30],
      [habitReminderKey('a', 5), 6, 8, 30],
    ]);
  });

  it('ignores archived habits and habits without a (valid) reminder time', () => {
    const plan = planHabitReminders(
      [
        habit({ id: 'archived', status: 'archived' }),
        habit({ id: 'none', reminderTime: null }),
        habit({ id: 'bad', reminderTime: '99:99' }),
      ],
      50,
    );
    expect(plan.slots).toEqual([]);
    expect(plan.skipped).toBe(0);
  });

  it('keeps the oldest habits and reports what exceeds the cap', () => {
    const daily = maskFromWeekdays([1, 2, 3, 4, 5, 6, 7]);
    const plan = planHabitReminders(
      [
        habit({ id: 'new', weekdaysMask: daily, createdAt: 20 }),
        habit({ id: 'old', weekdaysMask: daily, createdAt: 10 }),
      ],
      10,
    );
    expect(plan.slots).toHaveLength(10);
    expect(plan.slots.slice(0, 7).every((slot) => slot.habitId === 'old')).toBe(true);
    expect(plan.slots.slice(7).every((slot) => slot.habitId === 'new')).toBe(true);
    expect(plan.skipped).toBe(4);
  });
});
