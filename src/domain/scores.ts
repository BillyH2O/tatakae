import { PRODUCT } from '../config/product';
import type { DayGoal, LocalDate } from './types';

export type ScoreBucket = 'low' | 'mid' | 'good' | 'full';

const MAX_SCORE = 100;
const SEC_PER_MIN = 60;

/** `min(100, focus minutes / goal minutes × 100)`. Float, never rounded here (see `scoreDisplay`). */
export function dayScore(focusSec: number, goalMin: number): number {
  if (goalMin <= 0) return 0;
  return Math.min(MAX_SCORE, (Math.max(0, focusSec) / SEC_PER_MIN / goalMin) * MAX_SCORE);
}

/** Bucket of the raw score: < 40 low, < 80 mid, < 100 good, 100 full. */
export function scoreBucket(score: number): ScoreBucket {
  const { low, mid, good } = PRODUCT.score.buckets;
  if (score < low) return 'low';
  if (score < mid) return 'mid';
  if (score < good) return 'good';
  return 'full';
}

/** Displayed integer: floored, so 99.6 reads "99" and only a reached goal reads "100"; never above 100. */
export function scoreDisplay(score: number): number {
  return Math.min(MAX_SCORE, Math.max(0, Math.floor(score)));
}

export type DayCellState =
  | { kind: 'future' }
  | { kind: 'rest' }
  | { kind: 'noGoal' }
  | { kind: 'today'; score: number }
  | { kind: 'past'; score: number };

/**
 * What a calendar cell shows: a planned rest day is neutral, a day without goal has no score, a
 * future day has no score, today's score is in progress, a past day with a goal but no session is 0.
 */
export function dayCellState(date: LocalDate, today: LocalDate, goal: DayGoal, focusSec: number): DayCellState {
  if (goal.kind === 'rest') return { kind: 'rest' };
  if (goal.kind === 'none') return { kind: 'noGoal' };
  if (date > today) return { kind: 'future' };
  const score = dayScore(focusSec, goal.minutes);
  return date === today ? { kind: 'today', score } : { kind: 'past', score };
}
