import { PRODUCT } from '../config/product';
import { maskFromWeekdays, maskHasWeekday } from './habits';
import { chance, createRng, pick, randFloat, randInt, type Rng } from './random';
import { addDays, isoWeekday, parseLocalDate } from './time/localDate';
import type { IsoWeekday, LocalDate, StopReason } from './types';

const MS_PER_MIN = 60_000;
const STOP_REASONS = ['interrupted', 'tired', 'quest_done', 'other'] as const satisfies readonly StopReason[];
const RATINGS = [2, 3, 3, 4, 4, 4, 5, 5] as const;

export interface DemoSession {
  startedAt: number;
  endedAt: number;
  focusedSec: number;
  mode: 'countdown' | 'stopwatch';
  plannedSec: number | null;
  status: 'completed' | 'stopped';
  stopReason: StopReason | null;
  /** Interval excluded from the focus time (an actual pause), or null. */
  pause: { startedAt: number; endedAt: number } | null;
  /** Index into the app categories (modulo their count); null = uncategorized. */
  categoryIndex: number | null;
  rating: number | null;
  habitIndex: number | null;
  taskIndex: number | null;
}

export interface DemoHabit {
  title: string;
  categoryIndex: number;
  weekdaysMask: number;
  /** Planned dates already ticked (the ones linked to a session included). */
  doneDates: LocalDate[];
}

export interface DemoTask {
  title: string;
  categoryIndex: number | null;
  priority: 0 | 1 | 2;
  createdAt: number;
  dueDate: LocalDate | null;
  /** Completion instant and date, or null while the task is open. */
  done: { at: number; date: LocalDate } | null;
}

export interface DemoPlan {
  startDate: LocalDate;
  sessions: DemoSession[];
  habits: DemoHabit[];
  tasks: DemoTask[];
}

export interface DemoPlanInput {
  seed: number;
  today: LocalDate;
  /** Current instant: nothing is generated after it (today only holds past sessions). */
  nowMs: number;
  categoryCount: number;
  /** Minutes per ISO weekday; null = planned rest day. Defaults to the product defaults. */
  dailyGoalMin?: Record<IsoWeekday, number | null>;
}

const HABIT_DEFINITIONS = [
  { title: 'Read 20 pages', categoryIndex: 2, weekdays: [1, 2, 3, 4, 5, 6, 7] },
  { title: 'Workout', categoryIndex: 3, weekdays: [1, 3, 5] },
  { title: 'Review my notes', categoryIndex: 0, weekdays: [1, 2, 3, 4, 5] },
] as const satisfies readonly { title: string; categoryIndex: number; weekdays: readonly IsoWeekday[] }[];

// Offsets are in days relative to today (negative = past).
const TASK_DEFINITIONS = [
  { title: 'Summarize chapter 3', categoryIndex: 0, priority: 1, createdAgo: 60, dueIn: -52, doneAgo: 52 },
  { title: 'Set up the project repo', categoryIndex: 1, priority: 2, createdAgo: 56, dueIn: -50, doneAgo: 50 },
  { title: 'Read two articles', categoryIndex: 2, priority: 0, createdAgo: 45, dueIn: null, doneAgo: 40 },
  { title: 'Plan the training program', categoryIndex: 3, priority: 1, createdAgo: 38, dueIn: -33, doneAgo: 33 },
  { title: 'Prototype the home screen', categoryIndex: 1, priority: 2, createdAgo: 30, dueIn: -21, doneAgo: 21 },
  { title: 'Exam revision sheet', categoryIndex: 0, priority: 2, createdAgo: 20, dueIn: -9, doneAgo: 8 },
  { title: 'Write the release notes', categoryIndex: 1, priority: 1, createdAgo: 10, dueIn: -3, doneAgo: null },
  { title: 'Finish the current book', categoryIndex: 2, priority: 1, createdAgo: 14, dueIn: 0, doneAgo: null },
  { title: 'Book a physio appointment', categoryIndex: 3, priority: 0, createdAgo: 5, dueIn: 1, doneAgo: null },
  { title: 'Prepare the demo talk', categoryIndex: 1, priority: 2, createdAgo: 7, dueIn: 6, doneAgo: null },
  { title: 'Tidy the desk', categoryIndex: null, priority: 0, createdAgo: 3, dueIn: null, doneAgo: null },
] as const satisfies readonly {
  title: string;
  categoryIndex: number | null;
  priority: 0 | 1 | 2;
  createdAgo: number;
  dueIn: number | null;
  doneAgo: number | null;
}[];

/** Local wall-clock instant of a calendar day (DST-safe: uses the local calendar, not 24 h steps). */
export function localInstant(date: LocalDate, hour: number, minute: number): number {
  const { y, m, d } = parseLocalDate(date);
  return new Date(y, m - 1, d, hour, minute, 0, 0).getTime();
}

function defaultGoals(): Record<IsoWeekday, number | null> {
  const out = {} as Record<IsoWeekday, number | null>;
  for (const [key, value] of Object.entries(PRODUCT.goals.defaultDailyMin)) {
    out[Number(key) as IsoWeekday] = value === 'rest' ? null : value;
  }
  return out;
}

function planDay(rng: Rng, day: LocalDate, input: DemoPlanInput, goal: number | null): DemoSession[] {
  const config = PRODUCT.demo;
  let targetMin: number;
  if (goal === null) targetMin = chance(rng, config.restDayActiveChance) ? randInt(rng, 15, 40) : 0;
  else if (chance(rng, config.skipDayChance)) targetMin = 0;
  else targetMin = Math.round(goal * randFloat(rng, config.volumeFactor.min, config.volumeFactor.max));

  const limit = Math.min(localInstant(day, config.dayEndHour, 0), input.nowMs - MS_PER_MIN);
  let cursor = localInstant(day, config.dayStartHour, 0) + randInt(rng, 0, 90) * MS_PER_MIN;
  let remaining = targetMin;
  const sessions: DemoSession[] = [];
  const presets = PRODUCT.timer.focusPresetsMin;

  while (remaining >= PRODUCT.timer.minFocusMin) {
    const stopwatch = chance(rng, config.stopwatchChance);
    let mode: DemoSession['mode'] = 'countdown';
    let plannedMin: number | null = null;
    let focusMin: number;
    let status: DemoSession['status'] = 'completed';
    let stopReason: StopReason | null = null;

    if (stopwatch) {
      mode = 'stopwatch';
      focusMin = randInt(rng, 20, 70);
    } else {
      const fitting = presets.filter((preset) => preset <= remaining + 10);
      plannedMin = fitting.length > 0 ? pick(rng, fitting) : presets[0];
      focusMin = plannedMin;
      if (chance(rng, config.earlyStopChance)) {
        focusMin = Math.max(2, Math.floor(plannedMin * randFloat(rng, 0.3, 0.9)));
        status = 'stopped';
        stopReason = pick(rng, STOP_REASONS);
      }
    }

    let pause: DemoSession['pause'] = null;
    const startedAt = cursor;
    if (focusMin >= 20 && chance(rng, config.pauseChance)) {
      const pauseMin = randInt(rng, 2, 6);
      const pauseStart = startedAt + Math.floor(focusMin / 2) * MS_PER_MIN;
      pause = { startedAt: pauseStart, endedAt: pauseStart + pauseMin * MS_PER_MIN };
    }
    const endedAt = startedAt + focusMin * MS_PER_MIN + (pause ? pause.endedAt - pause.startedAt : 0);
    if (endedAt > limit) break;

    sessions.push({
      startedAt,
      endedAt,
      focusedSec: focusMin * 60,
      mode,
      plannedSec: plannedMin === null ? null : plannedMin * 60,
      status,
      stopReason,
      pause,
      categoryIndex: chance(rng, config.uncategorizedChance) ? null : randInt(rng, 0, input.categoryCount - 1),
      rating: chance(rng, config.ratedChance) ? pick(rng, RATINGS) : null,
      habitIndex: null,
      taskIndex: null,
    });
    remaining -= focusMin;
    cursor = endedAt + randInt(rng, config.gapMin.min, config.gapMin.max) * MS_PER_MIN;
  }
  return sessions;
}

/**
 * Random but reproducible demo history (`seed`): sessions over `PRODUCT.demo.historyDays` days with
 * pauses, early stops, ratings, one session across midnight, rest days, habits ticked or missed and
 * tasks done, overdue and upcoming. Pure: persisted by `services/demo/seedDemo.ts`.
 */
export function planDemoData(input: DemoPlanInput): DemoPlan {
  const config = PRODUCT.demo;
  const rng = createRng(input.seed);
  const goals = input.dailyGoalMin ?? defaultGoals();
  const startDate = addDays(input.today, -config.historyDays);
  const categoryCount = Math.max(1, input.categoryCount);
  const safeInput = { ...input, categoryCount };

  const habits: DemoHabit[] = HABIT_DEFINITIONS.map((definition) => ({
    title: definition.title,
    categoryIndex: definition.categoryIndex % categoryCount,
    weekdaysMask: maskFromWeekdays(definition.weekdays),
    doneDates: [],
  }));

  const sessions: DemoSession[] = [];
  for (let day = startDate; day <= input.today; day = addDays(day, 1)) {
    const weekday = isoWeekday(day);
    const daySessions = planDay(rng, day, safeInput, goals[weekday]);

    habits.forEach((habit, habitIndex) => {
      if (!maskHasWeekday(habit.weekdaysMask, weekday)) return;
      const linked = daySessions.find(
        (session) =>
          session.habitIndex === null &&
          session.categoryIndex !== null &&
          session.categoryIndex % categoryCount === habit.categoryIndex &&
          chance(rng, 0.6),
      );
      if (linked) {
        linked.habitIndex = habitIndex;
        habit.doneDates.push(day);
      } else if (day < input.today && chance(rng, config.habitDoneChance)) {
        habit.doneDates.push(day);
      }
    });
    sessions.push(...daySessions);
  }

  // One session across midnight (split over two days by the day segments).
  const midnightDay = addDays(input.today, -config.midnightSessionDaysAgo);
  if (midnightDay >= startDate) {
    const startedAt = localInstant(midnightDay, 23, 35);
    sessions.push({
      startedAt,
      endedAt: startedAt + 45 * MS_PER_MIN,
      focusedSec: 45 * 60,
      mode: 'countdown',
      plannedSec: 45 * 60,
      status: 'completed',
      stopReason: null,
      pause: null,
      categoryIndex: randInt(rng, 0, categoryCount - 1),
      rating: 4,
      habitIndex: null,
      taskIndex: null,
    });
  }
  sessions.sort((a, b) => a.startedAt - b.startedAt);

  const tasks: DemoTask[] = TASK_DEFINITIONS.filter((task) => task.createdAgo <= config.historyDays).map(
    (definition, taskIndex) => {
      const doneDate = definition.doneAgo === null ? null : addDays(input.today, -definition.doneAgo);
      let done: DemoTask['done'] = null;
      if (doneDate) {
        const doneDaySession = sessions.find(
          (session) =>
            session.habitIndex === null &&
            session.taskIndex === null &&
            session.startedAt >= localInstant(doneDate, 0, 0) &&
            session.startedAt < localInstant(addDays(doneDate, 1), 0, 0),
        );
        if (doneDaySession) doneDaySession.taskIndex = taskIndex;
        done = { at: doneDaySession?.endedAt ?? localInstant(doneDate, 18, 0), date: doneDate };
      }
      return {
        title: definition.title,
        categoryIndex: definition.categoryIndex === null ? null : definition.categoryIndex % categoryCount,
        priority: definition.priority,
        createdAt: localInstant(addDays(input.today, -definition.createdAgo), 9, 0),
        dueDate: definition.dueIn === null ? null : addDays(input.today, definition.dueIn),
        done,
      };
    },
  );

  return { startDate, sessions, habits, tasks };
}
