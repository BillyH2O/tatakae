import { APP_STATE_KEYS, NOTIFICATION_KEYS } from '../config/appStateKeys';
import { PRODUCT } from '../config/product';
import {
  deleteScheduledNotification,
  getActiveSession,
  getScheduledNotification,
  listHabits,
  listPauses,
  listScheduledNotifications,
  upsertScheduledNotification,
} from '../db/repositories';
import { appStateRepo } from '../db/repositories/keyValue';
import type { SqlDb } from '../db/SqlDb';
import { HABIT_REMINDER_KEY_PREFIX, planHabitReminders } from '../domain/notifications';
import { deadline } from '../domain/timer/machine';
import { en } from '../i18n/en';
import type { Clock } from './clock';
import { dataEvents } from './dataEvents';
import {
  type ExactAlarmState,
  type NotificationContent,
  type NotificationsPort,
  type PermissionState,
  noopPort,
} from './notifications/port';

/**
 * Single entry point to local notifications (ARCHITECTURE.md §6). The OS scheduler is reached only
 * through a `NotificationsPort` (no-op on web), the DB table `scheduled_notifications` remembers
 * what was scheduled, and every function is best effort: a notification failure never breaks the
 * timer, a quest, or any other screen.
 */
let port: NotificationsPort = noopPort;
let setupDone: Promise<void> | null = null;

/** Installs the platform adapter (app start, tests). */
export function configureNotifications(next: NotificationsPort): void {
  port = next;
  setupDone = null;
}

/** Installs the foreground handler and Android channels (once). Must precede any permission request. */
export function setupNotifications(): Promise<void> {
  setupDone ??= port.setup().catch((error: unknown) => {
    setupDone = null;
    console.warn('Notification setup failed', error);
  });
  return setupDone;
}

// One scheduler operation at a time: start → pause → resume in quick succession stays ordered.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T | undefined> {
  const run = queue.then(operation, operation).catch((error: unknown) => {
    console.warn('Notification scheduling failed', error);
    return undefined;
  });
  queue = run;
  return run;
}

async function cancelByKey(db: SqlDb, key: string): Promise<void> {
  const existing = await getScheduledNotification(db, key);
  if (!existing) return;
  try {
    await port.cancel(existing.notificationId);
  } finally {
    await deleteScheduledNotification(db, key);
  }
}

/** Replaces the notification stored under `key` (cancel first: a stale alert would be wrong). */
async function scheduleOneShot(
  db: SqlDb,
  clock: Clock,
  key: string,
  content: NotificationContent,
  atMs: number,
): Promise<void> {
  if (atMs <= clock.now()) {
    await cancelByKey(db, key); // already due: nothing left to announce
    return;
  }
  const existing = await getScheduledNotification(db, key);
  if (existing?.fireAt === atMs) return; // already scheduled for this exact instant
  await cancelByKey(db, key);
  if ((await port.getPermission()) !== 'granted') return;
  const notificationId = await port.scheduleAt(content, atMs);
  await upsertScheduledNotification(db, { key, notificationId, fireAt: atMs }, clock.now());
}

const SESSION_END: NotificationContent = {
  title: en.notifications.sessionEndTitle,
  body: en.notifications.sessionEndBody,
  kind: 'session-end',
  channel: 'timer',
};

const BREAK_END: NotificationContent = {
  title: en.notifications.breakEndTitle,
  body: en.notifications.breakEndBody,
  kind: 'break-end',
  channel: 'timer',
};

/**
 * Aligns the `session-end` and `break-end` notifications with the stored timer state: scheduled at
 * the deadline of a running countdown, or at the end of the break in progress, cancelled otherwise
 * (paused, finished, discarded, stopwatch). Idempotent, so it is called after every transition,
 * at launch and when the app comes back to the foreground.
 */
export function syncTimerNotifications(db: SqlDb, clock: Clock): Promise<void> {
  return enqueue(async () => {
    const session = await getActiveSession(db);
    let sessionEnd: number | null = null;
    if (session && session.status === 'running' && session.mode === 'countdown') {
      sessionEnd = deadline(session, await listPauses(db, session.id));
    }
    if (sessionEnd === null) await cancelByKey(db, NOTIFICATION_KEYS.sessionEnd);
    else await scheduleOneShot(db, clock, NOTIFICATION_KEYS.sessionEnd, SESSION_END, sessionEnd);

    const activeBreak = session
      ? null
      : await appStateRepo.get<{ startedAt: number; durationSec: number }>(db, APP_STATE_KEYS.activeBreak);
    if (!activeBreak) await cancelByKey(db, NOTIFICATION_KEYS.breakEnd);
    else {
      const end = activeBreak.startedAt + activeBreak.durationSec * 1000;
      await scheduleOneShot(db, clock, NOTIFICATION_KEYS.breakEnd, BREAK_END, end);
    }
  }).then(() => undefined);
}

export interface HabitReminderSyncResult {
  scheduled: number;
  /** Planned weekly reminders that exceed `PRODUCT.notifications.maxHabitReminders`. */
  skipped: number;
}

/**
 * Full resync of the weekly habit reminders (one trigger per habit and planned weekday): cancels
 * what was scheduled, then schedules the desired set. Calling it twice yields the same state.
 * Without the permission nothing stays scheduled.
 */
export function syncHabitReminders(db: SqlDb, clock: Clock): Promise<HabitReminderSyncResult> {
  return enqueue(async (): Promise<HabitReminderSyncResult> => {
    const habits = await listHabits(db);
    const plan = planHabitReminders(habits, PRODUCT.notifications.maxHabitReminders);

    for (const entry of await listScheduledNotifications(db, HABIT_REMINDER_KEY_PREFIX)) {
      await cancelByKey(db, entry.key);
    }
    if (plan.slots.length === 0 || (await port.getPermission()) !== 'granted') {
      return { scheduled: 0, skipped: plan.skipped };
    }

    let scheduled = 0;
    for (const slot of plan.slots) {
      const content: NotificationContent = {
        title: slot.title,
        body: en.notifications.habitBody,
        kind: 'habit-reminder',
        channel: 'reminders',
      };
      const notificationId = await port.scheduleWeekly(content, slot.expoWeekday, slot.hour, slot.minute);
      await upsertScheduledNotification(db, { key: slot.key, notificationId, fireAt: null }, clock.now());
      scheduled += 1;
    }
    return { scheduled, skipped: plan.skipped };
  }).then((result) => {
    dataEvents.emit('notifications');
    return result ?? { scheduled: 0, skipped: 0 };
  });
}

/** What is really scheduled, and what does not fit under the cap (warning in Settings). */
export async function getHabitReminderSummary(db: SqlDb): Promise<HabitReminderSyncResult> {
  const skipped = planHabitReminders(await listHabits(db), PRODUCT.notifications.maxHabitReminders).skipped;
  const scheduled = (await listScheduledNotifications(db, HABIT_REMINDER_KEY_PREFIX)).length;
  return { scheduled, skipped };
}

/**
 * Asks for the system permission in context (first countdown start, enabling a reminder), at most
 * once automatically: after that only the explicit button in Settings asks again. A refusal never
 * blocks anything. Android channels are created before the request (required on Android 13+).
 */
export async function requestPermissionInContext(db: SqlDb, clock: Clock): Promise<PermissionState> {
  try {
    if (!port.supported) return 'denied';
    const current = await port.getPermission();
    if (current !== 'undetermined') return current;
    if (await appStateRepo.get<boolean>(db, APP_STATE_KEYS.notificationPermissionAsked)) return current;
    await appStateRepo.set(db, APP_STATE_KEYS.notificationPermissionAsked, true, clock.now());
    await setupNotifications();
    return await port.requestPermission();
  } catch (error) {
    console.warn('Notification permission request failed', error);
    return 'denied';
  }
}

export interface NotificationStatus {
  supported: boolean;
  permission: PermissionState;
  exactAlarm: ExactAlarmState;
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (!port.supported) return { supported: false, permission: 'denied', exactAlarm: 'notApplicable' };
  try {
    return { supported: true, permission: await port.getPermission(), exactAlarm: await port.getExactAlarm() };
  } catch (error) {
    console.warn('Notification status failed', error);
    return { supported: true, permission: 'denied', exactAlarm: 'notApplicable' };
  }
}

/** Explicit user action (Settings): prompts again if the OS still allows it, then reschedules. */
export async function enableNotifications(db: SqlDb, clock: Clock): Promise<NotificationStatus> {
  if (port.supported) {
    try {
      await setupNotifications();
      await port.requestPermission();
    } catch (error) {
      console.warn('Notification permission request failed', error);
    }
  }
  await syncAllNotifications(db, clock);
  return getNotificationStatus();
}

export async function requestExactAlarm(): Promise<ExactAlarmState> {
  try {
    return await port.requestExactAlarm();
  } catch (error) {
    console.warn('Exact alarm request failed', error);
    return 'denied';
  }
}

/** Launch / permission change: timer notifications and habit reminders realigned with the DB. */
export async function syncAllNotifications(db: SqlDb, clock: Clock): Promise<HabitReminderSyncResult> {
  await syncTimerNotifications(db, clock);
  return syncHabitReminders(db, clock);
}
