import { PRODUCT } from '../config/product';
import { APP_STATE_KEYS, type PriorityMission } from '../config/appStateKeys';
import {
  archiveHabit,
  archiveTask,
  completeOccurrence,
  completeTask,
  createHabit,
  createTask,
  deleteFuturePendingOccurrences,
  getHabit,
  getOccurrence,
  getTask,
  insertOccurrencesIgnore,
  listHabits,
  listOccurrencesForDate,
  listOccurrencesForHabit,
  listTasks,
  reopenOccurrence,
  reopenTask,
  updateHabit,
  updateTask,
} from '../db/repositories';
import { appStateRepo } from '../db/repositories/keyValue';
import type { SqlDb } from '../db/SqlDb';
import { occurrenceDatesToEnsure } from '../domain/habits';
import { normalizeHabitTitle } from '../domain/habitStyle';
import { parseReminderTime } from '../domain/notifications';
import { sanitizePriorityMission } from '../domain/quests';
import { addDays, toLocalDate } from '../domain/time/localDate';
import type { Habit, LocalDate, TaskPriority } from '../domain/types';
import type { Clock } from './clock';
import { dataEvents } from './dataEvents';
import type { IdGenerator } from './ids';
import { requestPermissionInContext, syncHabitReminders } from './notificationService';

/** Habit reminders follow the habits: resynced after any change (asks the permission in context). */
async function resyncHabitReminders(db: SqlDb, clock: Clock, askPermission: boolean): Promise<void> {
  if (askPermission) await requestPermissionInContext(db, clock);
  await syncHabitReminders(db, clock);
}

function habitSchedule(habit: Habit) {
  return {
    weekdaysMask: habit.weekdaysMask,
    startLocalDate: habit.startLocalDate,
    archivedLocalDate: habit.archivedLocalDate,
    status: habit.status,
  };
}

async function materializeHabit(
  tx: SqlDb,
  habit: Habit,
  from: LocalDate,
  to: LocalDate,
  newId: IdGenerator,
  now: number,
): Promise<void> {
  const dates = occurrenceDatesToEnsure(habitSchedule(habit), from, to);
  await insertOccurrencesIgnore(
    tx,
    dates.map((localDate) => ({ id: newId(), habitId: habit.id, localDate })),
    now,
  );
}

/** Ensures occurrences exist through today + horizon for every active habit. Idempotent. */
export async function ensureOccurrenceHorizon(
  db: SqlDb,
  clock: Clock,
  newId: IdGenerator,
): Promise<void> {
  const today = toLocalDate(clock.now());
  const horizon = addDays(today, PRODUCT.quests.occurrenceHorizonDays);
  const ensured =
    (await appStateRepo.get<LocalDate>(db, APP_STATE_KEYS.occurrencesEnsuredThrough)) ?? null;

  const habits = await listHabits(db);
  await db.transaction(async (tx) => {
    for (const habit of habits) {
      let from = ensured ? addDays(ensured, 1) : habit.startLocalDate;
      if (from < habit.startLocalDate) from = habit.startLocalDate;
      if (from > horizon) continue;
      await materializeHabit(tx, habit, from, horizon, newId, clock.now());
    }
    await appStateRepo.set(tx, APP_STATE_KEYS.occurrencesEnsuredThrough, horizon, clock.now());
  });
  dataEvents.emit('quests');
}

export async function createTaskQuest(
  db: SqlDb,
  clock: Clock,
  input: {
    id: string;
    title: string;
    categoryId: string | null;
    dueDate: LocalDate | null;
    priority: TaskPriority;
  },
): Promise<void> {
  await createTask(db, input, clock.now());
  dataEvents.emit('quests');
}

export async function createHabitQuest(
  db: SqlDb,
  clock: Clock,
  input: {
    id: string;
    title: string;
    color?: string;
    icon?: string;
    categoryId: string | null;
    weekdaysMask: number;
    reminderTime: string | null;
  },
  newId: IdGenerator,
): Promise<void> {
  const title = normalizeHabitTitle(input.title);
  if (title === null) throw new Error('A habit needs a name');
  const today = toLocalDate(clock.now());
  const horizon = addDays(today, PRODUCT.quests.occurrenceHorizonDays);
  await db.transaction(async (tx) => {
    await createHabit(
      tx,
      { ...input, title, startLocalDate: today },
      clock.now(),
    );
    const habit = await getHabit(tx, input.id);
    if (!habit) throw new Error('Habit missing after insert');
    await materializeHabit(tx, habit, today, horizon, newId, clock.now());
  });
  dataEvents.emit('quests');
  await resyncHabitReminders(db, clock, input.reminderTime !== null);
}

/** Renames a habit and changes its color / icon. History and occurrences are untouched. */
export async function updateHabitDetails(
  db: SqlDb,
  clock: Clock,
  habitId: string,
  patch: { title: string; color: string; icon: string },
): Promise<void> {
  const title = normalizeHabitTitle(patch.title);
  if (title === null) throw new Error('A habit needs a name');
  await updateHabit(db, habitId, { title, color: patch.color, icon: patch.icon }, clock.now());
  dataEvents.emit('quests');
  // The reminder notification carries the habit name.
  await resyncHabitReminders(db, clock, false);
}

/** Sets or clears (`null`) the weekly reminder of a habit; the time is validated by the caller. */
export async function updateHabitReminder(
  db: SqlDb,
  clock: Clock,
  habitId: string,
  reminderTime: string | null,
): Promise<void> {
  if (reminderTime !== null && parseReminderTime(reminderTime) === null) {
    throw new Error('Reminder time must be a 24 h HH:MM time');
  }
  await updateHabit(db, habitId, { reminderTime }, clock.now());
  dataEvents.emit('quests');
  await resyncHabitReminders(db, clock, reminderTime !== null);
}

export async function updateHabitSchedule(
  db: SqlDb,
  clock: Clock,
  habitId: string,
  patch: { weekdaysMask: number },
  newId: IdGenerator,
): Promise<void> {
  const today = toLocalDate(clock.now());
  const horizon = addDays(today, PRODUCT.quests.occurrenceHorizonDays);
  await db.transaction(async (tx) => {
    const before = await getHabit(tx, habitId);
    if (!before) throw new Error('Habit not found');
    await materializeHabit(tx, before, today, today, newId, clock.now());
    await updateHabit(tx, habitId, patch, clock.now());
    await deleteFuturePendingOccurrences(tx, habitId, today, patch.weekdaysMask);
    const after = await getHabit(tx, habitId);
    if (!after) throw new Error('Habit missing after update');
    await materializeHabit(tx, after, addDays(today, 1), horizon, newId, clock.now());
  });
  dataEvents.emit('quests');
  await resyncHabitReminders(db, clock, false);
}

export async function setPriorityMission(db: SqlDb, clock: Clock, mission: PriorityMission): Promise<void> {
  await appStateRepo.set(db, APP_STATE_KEYS.priorityMission, mission, clock.now());
  dataEvents.emit('quests');
}

export async function clearPriorityMissionIfInvalid(db: SqlDb, clock: Clock): Promise<void> {
  const mission = await appStateRepo.get<PriorityMission>(db, APP_STATE_KEYS.priorityMission);
  const sanitized = sanitizePriorityMission(mission, await listTasks(db), await listHabits(db));
  if (mission && !sanitized) {
    await appStateRepo.remove(db, APP_STATE_KEYS.priorityMission);
    dataEvents.emit('quests');
  }
}

export async function toggleTaskComplete(
  db: SqlDb,
  clock: Clock,
  taskId: string,
  completedLocalDate: LocalDate,
): Promise<void> {
  const task = await getTask(db, taskId);
  if (!task) return;
  if (task.status === 'open') await completeTask(db, taskId, completedLocalDate, clock.now());
  else if (task.status === 'done') await reopenTask(db, taskId, clock.now());
  await clearPriorityMissionIfInvalid(db, clock);
  dataEvents.emit('quests');
}

export async function toggleOccurrenceComplete(db: SqlDb, clock: Clock, occurrenceId: string): Promise<void> {
  const occurrence = await getOccurrence(db, occurrenceId);
  if (!occurrence) return;
  if (occurrence.status === 'pending') await completeOccurrence(db, occurrenceId, clock.now());
  else await reopenOccurrence(db, occurrenceId, clock.now());
  await clearPriorityMissionIfInvalid(db, clock);
  dataEvents.emit('quests');
}

export async function archiveTaskQuest(db: SqlDb, clock: Clock, taskId: string): Promise<void> {
  await archiveTask(db, taskId, clock.now());
  await clearPriorityMissionIfInvalid(db, clock);
  dataEvents.emit('quests');
}

export async function archiveHabitQuest(db: SqlDb, clock: Clock, habitId: string): Promise<void> {
  const today = toLocalDate(clock.now());
  await archiveHabit(db, habitId, today, clock.now());
  await clearPriorityMissionIfInvalid(db, clock);
  dataEvents.emit('quests');
  await resyncHabitReminders(db, clock, false);
}

export async function loadQuestContext(db: SqlDb, date: LocalDate) {
  const [tasks, habits, occurrences, mission] = await Promise.all([
    listTasks(db),
    listHabits(db, { includeArchived: true }),
    listOccurrencesForDate(db, date),
    appStateRepo.get<PriorityMission>(db, APP_STATE_KEYS.priorityMission),
  ]);
  return { tasks, habits, occurrences, mission };
}

export { listOccurrencesForHabit, listTasks, getTask, getHabit, getOccurrence, updateTask, updateHabit };
