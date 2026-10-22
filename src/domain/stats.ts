import { PRODUCT } from '../config/product';
import { resolveDayGoal, resolveWeekGoal } from './goals';
import { type DayCellState, dayCellState, scoreBucket, type ScoreBucket } from './scores';
import { addDays, firstDayOfMonth, lastDayOfMonth, toLocalDate, weekStart } from './time/localDate';
import { type FocusByDay, sumFocusRange } from './totals';
import type { DailyGoalVersion, LocalDate, WeeklyGoalVersion } from './types';

export type StatsPeriod = 'week' | 'month';

export interface PeriodRange {
  period: StatsPeriod;
  from: LocalDate;
  to: LocalDate;
}

export function parsePeriod(value: string | undefined): StatsPeriod {
  return value === 'month' ? 'month' : 'week';
}

/** Week (Monday → Sunday) or calendar month containing `anchor`. */
export function periodRange(period: StatsPeriod, anchor: LocalDate): PeriodRange {
  if (period === 'month') return { period, from: firstDayOfMonth(anchor), to: lastDayOfMonth(anchor) };
  const from = weekStart(anchor);
  return { period, from, to: addDays(from, 6) };
}

/** Anchor of the previous (−1) or next (+1) period. */
export function shiftAnchor(period: StatsPeriod, anchor: LocalDate, delta: -1 | 1): LocalDate {
  const range = periodRange(period, anchor);
  return delta < 0 ? addDays(range.from, -1) : addDays(range.to, 1);
}

export const containsDate = (range: PeriodRange, date: LocalDate): boolean => date >= range.from && date <= range.to;

/** The visible period is the one containing today (no "next" beyond it is useful, but allowed). */
export const isCurrentPeriod = (range: PeriodRange, today: LocalDate): boolean => containsDate(range, today);

export interface CountedSession {
  startedAt: number;
  focusedSec: number;
}

export interface PeriodKpis {
  /** Σ focus segments of the period (same source as the header and Home). */
  focusSec: number;
  /** Counted sessions that started in the period. */
  sessionCount: number;
  /** Mean focused duration of those sessions; null when there is none (shown as "—"). */
  avgSessionSec: number | null;
}

/**
 * Definitions of ARCHITECTURE.md §4.9: the total comes from day segments (a session across
 * midnight or across two weeks is split), the count and the average from the sessions' start day.
 */
export function periodKpis(range: PeriodRange, byDay: FocusByDay, sessions: readonly CountedSession[]): PeriodKpis {
  const inPeriod = sessions.filter((session) => containsDate(range, toLocalDate(session.startedAt)));
  const total = inPeriod.reduce((sum, session) => sum + session.focusedSec, 0);
  return {
    focusSec: sumFocusRange(byDay, range.from, range.to),
    sessionCount: inPeriod.length,
    avgSessionSec: inPeriod.length === 0 ? null : Math.floor(total / inPeriod.length),
  };
}

export interface HistogramBar {
  date: LocalDate;
  /** Null for a future day: the bar is empty rather than "0". */
  focusSec: number | null;
  goalMin: number | null;
  rest: boolean;
}

export interface GoalContext {
  profileStart: LocalDate | null;
  dailyGoals: readonly DailyGoalVersion[];
  weeklyGoals: readonly WeeklyGoalVersion[];
}

function dayGoalOf(date: LocalDate, goals: GoalContext) {
  return goals.profileStart ? resolveDayGoal(date, goals.dailyGoals, goals.profileStart) : ({ kind: 'none' } as const);
}

/** One bar per day of the period with the goal of that day. */
export function histogramBars(range: PeriodRange, today: LocalDate, byDay: FocusByDay, goals: GoalContext): HistogramBar[] {
  const bars: HistogramBar[] = [];
  for (let date = range.from; date <= range.to; date = addDays(date, 1)) {
    const goal = dayGoalOf(date, goals);
    bars.push({
      date,
      focusSec: date > today ? null : (byDay.get(date) ?? 0),
      goalMin: goal.kind === 'goal' ? goal.minutes : null,
      rest: goal.kind === 'rest',
    });
  }
  return bars;
}

export const hasAnyFocus = (bars: readonly HistogramBar[]): boolean => bars.some((bar) => (bar.focusSec ?? 0) > 0);

export interface WeekGoalProgress {
  from: LocalDate;
  to: LocalDate;
  focusSec: number;
  goalMin: number | null;
  /** Floored percentage, capped at 100; null without a goal. */
  percent: number | null;
}

/** Weeks to show for the goal: the week itself, or every week touching the month. */
export function weeksOfPeriod(range: PeriodRange): LocalDate[] {
  const weeks: LocalDate[] = [];
  for (let from = weekStart(range.from); from <= range.to; from = addDays(from, 7)) weeks.push(from);
  return weeks;
}

export function weekGoalProgress(from: LocalDate, byDay: FocusByDay, goals: GoalContext): WeekGoalProgress {
  const to = addDays(from, 6);
  const focusSec = sumFocusRange(byDay, from, to);
  const goalMin = resolveWeekGoal(from, goals.weeklyGoals);
  const percent = goalMin === null ? null : Math.min(100, Math.floor((focusSec / 60 / goalMin) * 100));
  return { from, to, focusSec, goalMin, percent };
}

export interface HeatmapCell {
  date: LocalDate;
  state: DayCellState;
  /** Color bucket of a scored day; null for rest, no goal and future days. */
  bucket: ScoreBucket | null;
}

/** First Monday and last Sunday shown by the heatmap (the last `weeks` weeks, the current one included). */
export function heatmapRange(today: LocalDate, weeks: number = PRODUCT.stats.heatmapWeeks) {
  const lastWeek = weekStart(today);
  return { from: addDays(lastWeek, -(weeks - 1) * 7), to: addDays(lastWeek, 6) };
}

/** Columns of seven cells (Monday → Sunday), oldest week first; same states and buckets as the calendar. */
export function heatmapGrid(
  today: LocalDate,
  byDay: FocusByDay,
  goals: GoalContext,
  weeks: number = PRODUCT.stats.heatmapWeeks,
): HeatmapCell[][] {
  const { from } = heatmapRange(today, weeks);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(from, week * 7 + day);
      const state = dayCellState(date, today, dayGoalOf(date, goals), byDay.get(date) ?? 0);
      const bucket = state.kind === 'today' || state.kind === 'past' ? scoreBucket(state.score) : null;
      return { date, state, bucket };
    }),
  );
}

export type SessionBadge = 'manual' | 'corrected' | 'stopwatch' | 'stoppedEarly';

/** Badges of the history ("Manual entry", "Corrected", "Free timer", "Stopped early"). */
export function sessionBadges(session: {
  source: 'timer' | 'manual';
  mode: 'countdown' | 'stopwatch' | null;
  status: string;
  isCorrected: boolean;
}): SessionBadge[] {
  const badges: SessionBadge[] = [];
  if (session.source === 'manual') badges.push('manual');
  if (session.isCorrected) badges.push('corrected');
  if (session.source === 'timer' && session.mode === 'stopwatch') badges.push('stopwatch');
  if (session.status === 'stopped') badges.push('stoppedEarly');
  return badges;
}

export interface SessionHistoryItem {
  id: string;
  source: 'timer' | 'manual';
  mode: 'countdown' | 'stopwatch' | null;
  status: 'completed' | 'stopped';
  startedAt: number;
  endedAt: number;
  focusedSec: number;
  isCorrected: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryArchived: boolean;
  questTitle: string | null;
  rating: number | null;
}
