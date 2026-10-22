import { weekdaysFromMask } from './habits';
import type { Habit, IsoWeekday } from './types';

/** `expo-notifications` weekdays go from 1 (Sunday) to 7 (Saturday); ISO goes from 1 (Monday) to 7 (Sunday). */
export function isoToExpoWeekday(weekday: IsoWeekday): number {
  return (weekday % 7) + 1;
}

export interface ReminderTime {
  hour: number;
  minute: number;
}

const REMINDER_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parses a local `HH:MM` reminder time; null when the value is not a valid 24 h time. */
export function parseReminderTime(value: string | null): ReminderTime | null {
  if (value === null) return null;
  const match = REMINDER_TIME.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export interface HabitReminderSlot {
  /** Stable key in `scheduled_notifications`: one weekly trigger per habit and planned weekday. */
  key: string;
  habitId: string;
  title: string;
  isoWeekday: IsoWeekday;
  expoWeekday: number;
  hour: number;
  minute: number;
}

export interface HabitReminderPlan {
  slots: HabitReminderSlot[];
  /** Weekly triggers that do not fit under the cap (never scheduled). */
  skipped: number;
}

export const HABIT_REMINDER_KEY_PREFIX = 'habit:';

export function habitReminderKey(habitId: string, weekday: IsoWeekday): string {
  return `${HABIT_REMINDER_KEY_PREFIX}${habitId}:${weekday}`;
}

/**
 * Desired set of weekly habit reminders: active habits with a valid reminder time, one slot per
 * planned weekday, oldest habits first, truncated to `cap` (the OS limits pending notifications).
 */
export function planHabitReminders(habits: readonly Habit[], cap: number): HabitReminderPlan {
  const all: HabitReminderSlot[] = [];
  const ordered = [...habits].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  for (const habit of ordered) {
    if (habit.status !== 'active') continue;
    const time = parseReminderTime(habit.reminderTime);
    if (!time) continue;
    for (const weekday of weekdaysFromMask(habit.weekdaysMask)) {
      all.push({
        key: habitReminderKey(habit.id, weekday),
        habitId: habit.id,
        title: habit.title,
        isoWeekday: weekday,
        expoWeekday: isoToExpoWeekday(weekday),
        hour: time.hour,
        minute: time.minute,
      });
    }
  }
  const limit = Math.max(0, cap);
  return { slots: all.slice(0, limit), skipped: Math.max(0, all.length - limit) };
}
