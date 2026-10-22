import * as FileSystem from 'expo-file-system/legacy';

import { PRODUCT } from '../config/product';
import { SETTINGS_KEYS } from '../config/settingsKeys';
import { createCategory, createProfile, upsertDailyGoal, upsertWeeklyGoal } from '../db/repositories';
import { settingsRepo } from '../db/repositories/keyValue';
import type { SqlDb } from '../db/SqlDb';
import { defaultWeeklyGoalMin } from '../domain/goals';
import type { DailyGoalDraft } from '../domain/onboardingGoals';
import { toLocalDate, weekStart } from '../domain/time/localDate';
import type { IsoWeekday } from '../domain/types';
import { dataEvents } from './dataEvents';
import type { Clock } from './clock';
import type { IdGenerator } from './ids';

export interface OnboardingInput {
  displayName: string;
  avatarUri: string | null;
  dailyGoals: Record<IsoWeekday, DailyGoalDraft>;
  weeklyGoalMin: number | null;
}

export type AvatarCopier = (sourceUri: string) => Promise<string>;

/** Copies a picked image into app storage so temporary URIs never break the avatar. */
export async function copyAvatarToDocuments(sourceUri: string, newId: IdGenerator): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base) return sourceUri;
  const dir = `${base}avatars/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${newId()}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/**
 * First-time setup: profile, goal versions (effective today / this week), seed categories, timer
 * defaults. All or nothing.
 */
export async function completeOnboarding(
  db: SqlDb,
  clock: Clock,
  input: OnboardingInput,
  newId: IdGenerator,
  copyAvatar: AvatarCopier = (uri) => copyAvatarToDocuments(uri, newId),
): Promise<void> {
  const now = clock.now();
  const today = toLocalDate(now);
  const avatarUri =
    input.avatarUri === null ? null : await copyAvatar(input.avatarUri).catch(() => null);

  await db.transaction(async (tx) => {
    await createProfile(
      tx,
      { displayName: input.displayName, avatarUri, startLocalDate: today },
      now,
    );
    await settingsRepo.set(tx, SETTINGS_KEYS.timerDefaultFocusMin, PRODUCT.timer.defaultFocusMin, now);
    await settingsRepo.set(tx, SETTINGS_KEYS.timerDefaultBreakMin, PRODUCT.timer.defaultBreakMin, now);

    for (const weekday of [1, 2, 3, 4, 5, 6, 7] as const) {
      const draft = input.dailyGoals[weekday];
      if (draft.kind === 'goal') {
        await upsertDailyGoal(
          tx,
          { id: newId(), weekday, effectiveFrom: today, goalMin: draft.minutes, isRest: false },
          now,
        );
      } else if (draft.kind === 'rest') {
        await upsertDailyGoal(
          tx,
          { id: newId(), weekday, effectiveFrom: today, goalMin: null, isRest: true },
          now,
        );
      } else {
        await upsertDailyGoal(
          tx,
          { id: newId(), weekday, effectiveFrom: today, goalMin: null, isRest: false },
          now,
        );
      }
    }

    await upsertWeeklyGoal(tx, { effectiveFrom: weekStart(today), goalMin: input.weeklyGoalMin }, now);

    for (const [index, seed] of PRODUCT.categories.seed.entries()) {
      await createCategory(
        tx,
        {
          id: newId(),
          name: seed.name,
          icon: seed.icon,
          color: PRODUCT.categories.colorPalette[index % PRODUCT.categories.colorPalette.length]!,
        },
        now,
      );
    }
  });

  dataEvents.emit('profile', 'goals', 'categories', 'settings');
}

export function defaultOnboardingWeeklyGoalMin(): number {
  return PRODUCT.goals.defaultWeekly === 'sumOfDaily' ? defaultWeeklyGoalMin() : 0;
}
