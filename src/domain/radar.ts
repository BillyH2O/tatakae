import { PRODUCT } from '../config/product';
import { resolveDayGoal } from './goals';
import { addDays, toLocalDate } from './time/localDate';
import type { FocusByDay } from './totals';
import type { DailyGoalVersion, EpochMs, LocalDate, SessionMode, SessionStatus, StopReason } from './types';

export type RadarAxisId = 'strength' | 'endurance' | 'mental' | 'consistency';

export const RADAR_AXES: readonly RadarAxisId[] = ['strength', 'endurance', 'mental', 'consistency'];

/** A finalized session as far as the radar is concerned (rating joined in). */
export interface RadarSession {
  endedAt: EpochMs;
  status: SessionStatus;
  source: 'timer' | 'manual';
  mode: SessionMode | null;
  isCorrected: boolean;
  stopReason: StopReason | null;
  rating: number | null;
}

export type RadarDetail =
  | { axis: 'strength'; rated: number; required: number }
  | { axis: 'endurance'; focusMin: number; goalMin: number; goalDays: number }
  | { axis: 'mental'; completed: number; stopped: number; stopReasons: Partial<Record<StopReason, number>> }
  | { axis: 'consistency'; achieved: number; planned: number };

export interface RadarAxisResult {
  axis: RadarAxisId;
  /** 0..100, or null when there is not enough data (never a fake zero). */
  value: number | null;
  status: 'ok' | 'insufficient';
  /** Today is part of the figure and may still change. */
  inProgress: boolean;
  detail: RadarDetail;
}

export interface RadarInput {
  today: LocalDate;
  sessions: readonly RadarSession[];
  byDay: FocusByDay;
  dailyGoals: readonly DailyGoalVersion[];
  /** Null before onboarding: no goal applies. */
  profileStart: LocalDate | null;
}

const MAX_VALUE = 100;
const SEC_PER_MIN = 60;

/** First day of the window `[today − 13, today]`. */
export function radarWindowStart(today: LocalDate): LocalDate {
  return addDays(today, -(PRODUCT.radar.windowDays - 1));
}

function windowDays(today: LocalDate): LocalDate[] {
  const days: LocalDate[] = [];
  for (let day = radarWindowStart(today); day <= today; day = addDays(day, 1)) days.push(day);
  return days;
}

const isCounted = (session: RadarSession) => session.status === 'completed' || session.status === 'stopped';

/**
 * The four axes of "Current form" over the last 14 days (PRODUCT_SPEC §7). Pure: sessions and
 * per-day totals come from the caller. An axis without enough data is `insufficient`, never 0.
 */
export function computeRadar(input: RadarInput): RadarAxisResult[] {
  const { today, byDay, dailyGoals, profileStart } = input;
  const days = windowDays(today);
  const first = days[0] ?? today;
  const inWindow = input.sessions.filter((session) => {
    const day = toLocalDate(session.endedAt);
    return isCounted(session) && day >= first && day <= today;
  });

  // Strength — felt focus: average rating × 20, unrated sessions ignored.
  const ratings = inWindow.flatMap((session) => (session.rating === null ? [] : [session.rating]));
  const strengthOk = ratings.length >= PRODUCT.radar.forceMinRatings;
  const strength: RadarAxisResult = {
    axis: 'strength',
    value: strengthOk
      ? Math.min(MAX_VALUE, (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * PRODUCT.radar.ratingScale)
      : null,
    status: strengthOk ? 'ok' : 'insufficient',
    inProgress: false,
    detail: { axis: 'strength', rated: ratings.length, required: PRODUCT.radar.forceMinRatings },
  };

  // Goal days of the window (rest and "no goal" days are out).
  const goalDays = profileStart
    ? days.flatMap((day) => {
        const goal = resolveDayGoal(day, dailyGoals, profileStart);
        return goal.kind === 'goal' ? [{ day, goalMin: goal.minutes }] : [];
      })
    : [];

  // Endurance — planned volume achieved (today included, flagged in progress).
  const goalTotalMin = goalDays.reduce((sum, entry) => sum + entry.goalMin, 0);
  const focusOnGoalDaysSec = goalDays.reduce((sum, entry) => sum + (byDay.get(entry.day) ?? 0), 0);
  const enduranceOk = goalDays.length >= PRODUCT.radar.enduranceMinGoalDays && goalTotalMin > 0;
  const endurance: RadarAxisResult = {
    axis: 'endurance',
    value: enduranceOk ? Math.min(MAX_VALUE, (focusOnGoalDaysSec / SEC_PER_MIN / goalTotalMin) * MAX_VALUE) : null,
    status: enduranceOk ? 'ok' : 'insufficient',
    inProgress: enduranceOk && goalDays.some((entry) => entry.day === today),
    detail: {
      axis: 'endurance',
      focusMin: Math.floor(focusOnGoalDaysSec / SEC_PER_MIN),
      goalMin: goalTotalMin,
      goalDays: goalDays.length,
    },
  };

  // Mental — countdowns taken to the end; stopwatches, manual and corrected entries are excluded.
  const closed = inWindow.filter(
    (session) => session.source === 'timer' && session.mode === 'countdown' && !session.isCorrected,
  );
  const completed = closed.filter((session) => session.status === 'completed').length;
  const stoppedSessions = closed.filter((session) => session.status === 'stopped');
  const stopReasons: Partial<Record<StopReason, number>> = {};
  for (const session of stoppedSessions) {
    if (session.stopReason) stopReasons[session.stopReason] = (stopReasons[session.stopReason] ?? 0) + 1;
  }
  const mentalOk = closed.length >= Math.max(1, PRODUCT.radar.mentalMinClosed);
  const mental: RadarAxisResult = {
    axis: 'mental',
    value: mentalOk ? (completed / closed.length) * MAX_VALUE : null,
    status: mentalOk ? 'ok' : 'insufficient',
    inProgress: false,
    detail: { axis: 'mental', completed, stopped: stoppedSessions.length, stopReasons },
  };

  // Consistency — past goal days where the goal was reached; today only counts from tomorrow.
  const pastGoalDays = goalDays.filter((entry) => entry.day < today);
  const achieved = pastGoalDays.filter((entry) => (byDay.get(entry.day) ?? 0) / SEC_PER_MIN >= entry.goalMin).length;
  const consistencyOk = pastGoalDays.length >= Math.max(1, PRODUCT.radar.constanceMinDays);
  const consistency: RadarAxisResult = {
    axis: 'consistency',
    value: consistencyOk ? (achieved / pastGoalDays.length) * MAX_VALUE : null,
    status: consistencyOk ? 'ok' : 'insufficient',
    inProgress: false,
    detail: { axis: 'consistency', achieved, planned: pastGoalDays.length },
  };

  return [strength, endurance, mental, consistency];
}
