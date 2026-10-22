import { PRODUCT } from '../../config/product';
import { localInstant, planDemoData } from '../demoData';
import { createRng } from '../random';
import { addDays, asLocalDate as d, isoWeekday, toLocalDate } from '../time/localDate';
import { maskHasWeekday } from '../habits';

const TODAY = d('2026-10-22');
const NOW = new Date(2026, 9, 22, 20, 0, 0).getTime();
const input = (seed: number) => ({ seed, today: TODAY, nowMs: NOW, categoryCount: 4 });

describe('createRng', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const values = Array.from({ length: 200 }, () => a());
    expect(values).toEqual(Array.from({ length: 200 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(createRng(43)()).not.toBe(createRng(42)());
  });
});

describe('planDemoData', () => {
  it('is reproducible for a seed and different for another one', () => {
    expect(planDemoData(input(7))).toEqual(planDemoData(input(7)));
    expect(planDemoData(input(7)).sessions).not.toEqual(planDemoData(input(8)).sessions);
  });

  it('covers several weeks of history with plausible sessions', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const plan = planDemoData(input(seed));
      expect(plan.startDate).toBe(addDays(TODAY, -PRODUCT.demo.historyDays));
      expect(plan.sessions.length).toBeGreaterThan(40);
      const days = new Set(plan.sessions.map((session) => toLocalDate(session.startedAt)));
      expect(days.size).toBeGreaterThan(30);

      for (const session of plan.sessions) {
        expect(session.endedAt).toBeGreaterThan(session.startedAt);
        expect(session.endedAt).toBeLessThanOrEqual(NOW);
        expect(session.focusedSec).toBeGreaterThanOrEqual(PRODUCT.timer.minCountedSec);
        const pauseMs = session.pause ? session.pause.endedAt - session.pause.startedAt : 0;
        expect(session.endedAt - session.startedAt - pauseMs).toBe(session.focusedSec * 1000);
        if (session.pause) {
          expect(session.pause.startedAt).toBeGreaterThan(session.startedAt);
          expect(session.pause.endedAt).toBeLessThan(session.endedAt);
        }
        if (session.mode === 'countdown') {
          expect(session.plannedSec).not.toBeNull();
          if (session.status === 'completed') expect(session.focusedSec).toBe(session.plannedSec);
          else expect(session.focusedSec).toBeLessThan(session.plannedSec as number);
        } else {
          expect(session.plannedSec).toBeNull();
          expect(session.status).toBe('completed');
        }
        expect(session.stopReason !== null).toBe(session.status === 'stopped');
        if (session.rating !== null) {
          expect(session.rating).toBeGreaterThanOrEqual(1);
          expect(session.rating).toBeLessThanOrEqual(PRODUCT.timer.ratingMax);
        }
        if (session.categoryIndex !== null) expect(session.categoryIndex).toBeLessThan(4);
        expect(session.habitIndex !== null && session.taskIndex !== null).toBe(false);
      }
    }
  });

  it('never overlaps two sessions and keeps them sorted', () => {
    const { sessions } = planDemoData(input(11));
    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i]!.startedAt).toBeGreaterThanOrEqual(sessions[i - 1]!.endedAt);
    }
  });

  it('contains one session across midnight, split over two days', () => {
    const { sessions } = planDemoData(input(3));
    const crossing = sessions.filter((s) => toLocalDate(s.startedAt) !== toLocalDate(s.endedAt - 1));
    expect(crossing).toHaveLength(1);
    expect(toLocalDate(crossing[0]!.startedAt)).toBe(addDays(TODAY, -PRODUCT.demo.midnightSessionDaysAgo));
  });

  it('has no session in the future and respects the current time on today', () => {
    const early = planDemoData({ ...input(5), nowMs: new Date(2026, 9, 22, 7, 0, 0).getTime() });
    expect(early.sessions.every((s) => s.endedAt <= new Date(2026, 9, 22, 7, 0, 0).getTime())).toBe(true);
  });

  it('keeps most planned rest days free of sessions', () => {
    const { sessions } = planDemoData(input(9));
    const restDays = new Set<string>();
    for (let day = planDemoData(input(9)).startDate; day <= TODAY; day = addDays(day, 1)) {
      if (isoWeekday(day) === 7) restDays.add(day);
    }
    const busyRestDays = new Set(sessions.map((s) => toLocalDate(s.startedAt)).filter((day) => restDays.has(day)));
    expect(busyRestDays.size).toBeLessThan(restDays.size);
  });

  it('plans habits on their weekdays only and tasks with coherent dates', () => {
    const plan = planDemoData(input(21));
    expect(plan.habits.length).toBeGreaterThan(0);
    for (const habit of plan.habits) {
      expect(habit.doneDates.length).toBeGreaterThan(0);
      for (const date of habit.doneDates) {
        expect(maskHasWeekday(habit.weekdaysMask, isoWeekday(date))).toBe(true);
        expect(date <= TODAY).toBe(true);
      }
      expect(new Set(habit.doneDates).size).toBe(habit.doneDates.length);
    }
    expect(plan.tasks.some((t) => t.done)).toBe(true);
    expect(plan.tasks.some((t) => !t.done && t.dueDate !== null && t.dueDate < TODAY)).toBe(true); // overdue
    expect(plan.tasks.some((t) => !t.done && t.dueDate !== null && t.dueDate > TODAY)).toBe(true); // upcoming
    for (const task of plan.tasks) {
      if (task.done) expect(task.done.at).toBeGreaterThanOrEqual(task.createdAt);
    }
  });

  it('links a session to a habit only when the habit is done that day', () => {
    const plan = planDemoData(input(13));
    for (const session of plan.sessions) {
      if (session.habitIndex === null) continue;
      expect(plan.habits[session.habitIndex]!.doneDates).toContain(toLocalDate(session.startedAt));
    }
  });

  it('localInstant follows the local calendar', () => {
    expect(localInstant(d('2026-10-22'), 9, 30)).toBe(new Date(2026, 9, 22, 9, 30).getTime());
  });
});
