import { APP_STATE_KEYS } from '../../config/appStateKeys';
import { PRODUCT } from '../../config/product';
import { DEMO_DB_NAME } from '../../config/databaseNames';
import {
  appStateRepo,
  completeOccurrence,
  completeTask,
  createHabit,
  createTask,
  insertClosedPause,
  insertDaySegments,
  insertFinishedSession,
  insertXpOnce,
  listCategories,
  listOccurrencesForHabit,
  upsertRating,
  wipeUserData,
} from '../../db/repositories';
import type { SqlDb } from '../../db/SqlDb';
import { localInstant, planDemoData } from '../../domain/demoData';
import { defaultDailyGoalDrafts } from '../../domain/onboardingGoals';
import { splitIntervalsByLocalDay } from '../../domain/time/splitByDay';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import type { Interval, LocalDate } from '../../domain/types';
import { xpForFocusedSec } from '../../domain/xp';
import type { Clock } from '../clock';
import { dataEvents } from '../dataEvents';
import type { IdGenerator } from '../ids';
import { completeOnboarding, defaultOnboardingWeeklyGoalMin } from '../profileService';
import { ensureOccurrenceHorizon } from '../questService';

export interface SeedDemoOptions {
  /** Name of the database file `db` is connected to. Anything but the demo file is refused. */
  databaseName: string;
  /** Makes the generated history reproducible (defaults to the current instant: different each time). */
  seed?: number;
}

/**
 * Replaces the content of the **demo** database with a random multi-week history (profile, goals,
 * categories, sessions with pauses/ratings/XP, one session across midnight, habits, tasks). Refuses
 * to run on any other database, so real data can never be touched.
 */
export async function seedDemo(db: SqlDb, clock: Clock, newId: IdGenerator, options: SeedDemoOptions): Promise<void> {
  if (options.databaseName !== DEMO_DB_NAME) {
    throw new Error('Demo data can only be generated on the demo database');
  }
  const now = clock.now();
  const today = toLocalDate(now);
  const startDate = addDays(today, -PRODUCT.demo.historyDays);
  const startMs = localInstant(startDate, 9, 0);

  await db.transaction((tx) => wipeUserData(tx));

  // Profile, goals, categories and timer defaults exactly as a real onboarding, dated at the start of the history.
  await completeOnboarding(
    db,
    { now: () => startMs },
    {
      displayName: PRODUCT.demo.displayName,
      avatarUri: null,
      dailyGoals: defaultDailyGoalDrafts(),
      weeklyGoalMin: defaultOnboardingWeeklyGoalMin(),
    },
    newId,
  );

  const categories = await listCategories(db);
  const plan = planDemoData({
    seed: options.seed ?? now,
    today,
    nowMs: now,
    categoryCount: categories.length,
  });
  const categoryId = (index: number | null): string | null =>
    index === null || categories.length === 0 ? null : (categories[index % categories.length]?.id ?? null);

  const habitIds = plan.habits.map(() => newId());
  const taskIds = plan.tasks.map(() => newId());
  await db.transaction(async (tx) => {
    for (const [index, habit] of plan.habits.entries()) {
      await createHabit(
        tx,
        {
          id: habitIds[index] as string,
          title: habit.title,
          categoryId: categoryId(habit.categoryIndex),
          weekdaysMask: habit.weekdaysMask,
          // No reminder: demo mode must never schedule notifications.
          reminderTime: null,
          startLocalDate: plan.startDate,
        },
        startMs,
      );
    }
    for (const [index, task] of plan.tasks.entries()) {
      await createTask(
        tx,
        {
          id: taskIds[index] as string,
          title: task.title,
          categoryId: categoryId(task.categoryIndex),
          dueDate: task.dueDate,
          priority: task.priority,
        },
        task.createdAt,
      );
      if (task.done) await completeTask(tx, taskIds[index] as string, task.done.date, task.done.at);
    }
  });

  // Occurrences from the start of the history through today + horizon (same code path as the app).
  await ensureOccurrenceHorizon(db, clock, newId);

  await db.transaction(async (tx) => {
    const occurrenceIds = new Map<string, string>();
    for (const [index, habitId] of habitIds.entries()) {
      for (const occurrence of await listOccurrencesForHabit(tx, habitId)) {
        occurrenceIds.set(`${index}:${occurrence.localDate}`, occurrence.id);
      }
    }
    const completedAt = new Map<string, number>();

    for (const session of plan.sessions) {
      const id = newId();
      const date = toLocalDate(session.startedAt);
      const occurrenceKey = session.habitIndex === null ? null : `${session.habitIndex}:${date}`;
      const occurrenceId = occurrenceKey === null ? null : (occurrenceIds.get(occurrenceKey) ?? null);
      if (occurrenceKey !== null && occurrenceId !== null) completedAt.set(occurrenceKey, session.endedAt);

      await insertFinishedSession(tx, {
        id,
        mode: session.mode,
        status: session.status,
        plannedSec: session.plannedSec,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        focusedSec: session.focusedSec,
        stopReason: session.stopReason,
        categoryId: categoryId(session.categoryIndex),
        taskId: session.taskIndex === null ? null : (taskIds[session.taskIndex] ?? null),
        habitOccurrenceId: occurrenceId,
      });

      const intervals: Interval[] = session.pause
        ? [
            { start: session.startedAt, end: session.pause.startedAt },
            { start: session.pause.endedAt, end: session.endedAt },
          ]
        : [{ start: session.startedAt, end: session.endedAt }];
      if (session.pause) {
        await insertClosedPause(tx, {
          id: newId(),
          sessionId: id,
          startedAt: session.pause.startedAt,
          endedAt: session.pause.endedAt,
        });
      }
      await insertDaySegments(tx, id, splitIntervalsByLocalDay(intervals));

      if (session.rating !== null) await upsertRating(tx, id, session.rating, session.endedAt + 20_000);
      const xp = xpForFocusedSec(session.focusedSec);
      if (xp > 0) {
        await insertXpOnce(
          tx,
          { id: newId(), sourceKey: `session:${id}:r0`, sessionId: id, amount: xp, ruleVersion: PRODUCT.xp.ruleVersion },
          session.endedAt,
        );
      }
    }

    for (const [habitIndex, habit] of plan.habits.entries()) {
      for (const date of habit.doneDates as LocalDate[]) {
        const key = `${habitIndex}:${date}`;
        const occurrenceId = occurrenceIds.get(key);
        if (occurrenceId) await completeOccurrence(tx, occurrenceId, completedAt.get(key) ?? localInstant(date, 20, 0));
      }
    }

    await appStateRepo.set(tx, APP_STATE_KEYS.demoSeededAt, now, now);
  });

  dataEvents.emit('profile', 'goals', 'categories', 'settings', 'sessions', 'quests', 'xp', 'wallet');
}

/** Opening the demo database for the first time (or after an interrupted seeding) generates its content. */
export async function ensureDemoSeeded(
  db: SqlDb,
  clock: Clock,
  newId: IdGenerator,
  databaseName: string,
): Promise<void> {
  if (databaseName !== DEMO_DB_NAME) return;
  if ((await appStateRepo.get<number>(db, APP_STATE_KEYS.demoSeededAt)) !== null) return;
  await seedDemo(db, clock, newId, { databaseName });
}
