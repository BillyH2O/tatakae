import { upsertDailyGoal, upsertWeeklyGoal } from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import type { DailyGoalDraft } from '../domain/onboardingGoals';
import { weekStart } from '../domain/time/localDate';
import type { IsoWeekday, LocalDate } from '../domain/types';
import { dataEvents } from './dataEvents';
import type { Clock } from './clock';
import type { IdGenerator } from './ids';

/** Writes new goal versions effective from `effectiveFrom` (today when editing in Settings). */
export async function saveDailyGoals(
  db: SqlDb,
  clock: Clock,
  newId: IdGenerator,
  effectiveFrom: LocalDate,
  byWeekday: Record<IsoWeekday, DailyGoalDraft>,
): Promise<void> {
  const now = clock.now();
  await db.transaction(async (tx) => {
    for (const weekday of [1, 2, 3, 4, 5, 6, 7] as const) {
      const draft = byWeekday[weekday];
      if (draft.kind === 'goal') {
        await upsertDailyGoal(
          tx,
          {
            id: newId(),
            weekday,
            effectiveFrom,
            goalMin: draft.minutes,
            isRest: false,
          },
          now,
        );
      } else if (draft.kind === 'rest') {
        await upsertDailyGoal(
          tx,
          { id: newId(), weekday, effectiveFrom, goalMin: null, isRest: true },
          now,
        );
      } else {
        await upsertDailyGoal(
          tx,
          { id: newId(), weekday, effectiveFrom, goalMin: null, isRest: false },
          now,
        );
      }
    }
  });
  dataEvents.emit('goals');
}

export async function saveWeeklyGoal(
  db: SqlDb,
  clock: Clock,
  effectiveFrom: LocalDate,
  goalMin: number | null,
): Promise<void> {
  const week = weekStart(effectiveFrom);
  await upsertWeeklyGoal(db, { effectiveFrom: week, goalMin }, clock.now());
  dataEvents.emit('goals');
}
