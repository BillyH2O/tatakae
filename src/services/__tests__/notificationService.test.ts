/** @jest-environment node */
import { listScheduledNotifications, listHabits } from '../../db/repositories';
import { appStateRepo } from '../../db/repositories/keyValue';
import { maskFromWeekdays } from '../../domain/habits';
import { createMigratedDb } from '../../test/factories';
import { createFakeClock, createSequentialIds } from '../../test/fakeClock';
import {
  createFakeNotificationsPort,
  type FakeNotificationsPort,
  pendingOfKind,
} from '../../test/fakeNotificationsPort';
import { PRODUCT } from '../../config/product';
import {
  configureNotifications,
  enableNotifications,
  getHabitReminderSummary,
  getNotificationStatus,
  requestPermissionInContext,
  syncHabitReminders,
  syncTimerNotifications,
} from '../notificationService';
import { noopPort } from '../notifications/port';
import { archiveHabitQuest, createHabitQuest, updateHabitReminder, updateHabitSchedule } from '../questService';
import {
  endBreak,
  finishSession,
  pauseSession,
  resumeSession,
  startBreak,
  startSession,
  type StartSessionInput,
} from '../sessionService';

const MIN = 60_000;
const START = new Date(2026, 9, 22, 9, 0, 0).getTime();

const countdown = (min: number): StartSessionInput => ({
  mode: 'countdown',
  plannedSec: min * 60,
  categoryId: null,
  taskId: null,
  habitOccurrenceId: null,
});

async function setup(permission: 'granted' | 'denied' | 'undetermined' = 'granted') {
  const db = await createMigratedDb(START);
  const clock = createFakeClock(START);
  const newId = createSequentialIds('n');
  const port = createFakeNotificationsPort(permission);
  configureNotifications(port);
  return { db, clock, newId, port };
}

afterEach(() => configureNotifications(noopPort));

async function startOk(env: Awaited<ReturnType<typeof setup>>, input: StartSessionInput) {
  const result = await startSession(env.db, env.clock, env.newId, input);
  if (!result.ok) throw new Error('start refused');
  return result.sessionId;
}

function sessionEnds(port: FakeNotificationsPort) {
  return pendingOfKind(port, 'session-end');
}

describe('session-end notification', () => {
  it('is scheduled at the deadline of a started countdown, on the timer channel', async () => {
    const env = await setup();
    await startOk(env, countdown(25));
    const [entry] = sessionEnds(env.port);
    expect(sessionEnds(env.port)).toHaveLength(1);
    expect(entry?.at).toBe(START + 25 * MIN);
    expect(entry?.content.channel).toBe('timer');
    expect(await listScheduledNotifications(env.db, 'session-end')).toHaveLength(1);
  });

  it('is never scheduled for a stopwatch', async () => {
    const env = await setup();
    await startOk(env, { ...countdown(25), mode: 'stopwatch', plannedSec: null });
    expect(env.port.pending.size).toBe(0);
  });

  it('is cancelled on pause and rescheduled on resume with the pause time added', async () => {
    const env = await setup();
    const id = await startOk(env, countdown(25));

    env.clock.advance(10 * MIN);
    await pauseSession(env.db, env.clock, env.newId, id);
    expect(sessionEnds(env.port)).toHaveLength(0);
    expect(await listScheduledNotifications(env.db, 'session-end')).toHaveLength(0);

    env.clock.advance(5 * MIN);
    await resumeSession(env.db, env.clock, id);
    const [entry] = sessionEnds(env.port);
    expect(sessionEnds(env.port)).toHaveLength(1);
    expect(entry?.at).toBe(START + 30 * MIN);
  });

  it('is cancelled when the session is finished or discarded', async () => {
    const finished = await setup();
    const id = await startOk(finished, countdown(25));
    finished.clock.advance(10 * MIN);
    await finishSession(finished.db, finished.clock, finished.newId, id, { reason: null });
    expect(finished.port.pending.size).toBe(0);

    const discarded = await setup();
    const other = await startOk(discarded, countdown(25));
    discarded.clock.advance(20_000);
    await finishSession(discarded.db, discarded.clock, discarded.newId, other, { discard: true });
    expect(discarded.port.pending.size).toBe(0);
    expect(await listScheduledNotifications(discarded.db)).toHaveLength(0);
  });

  it('keeps a single notification when synchronised repeatedly (idempotent)', async () => {
    const env = await setup();
    await startOk(env, countdown(25));
    await syncTimerNotifications(env.db, env.clock);
    await syncTimerNotifications(env.db, env.clock);
    expect(sessionEnds(env.port)).toHaveLength(1);
    expect(env.port.scheduledTotal).toBe(1);
  });

  it('schedules nothing without the permission, and the session still starts', async () => {
    const env = await setup('denied');
    const result = await startSession(env.db, env.clock, env.newId, countdown(25));
    expect(result.ok).toBe(true);
    expect(env.port.pending.size).toBe(0);
  });

  it('survives a scheduler failure: the timer is not affected', async () => {
    const env = await setup();
    env.port.failScheduling = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await startSession(env.db, env.clock, env.newId, countdown(25));
    warn.mockRestore();
    expect(result.ok).toBe(true);
  });

  it('is rescheduled after a restart that lost it, and dropped once the deadline has passed', async () => {
    const env = await setup();
    await startOk(env, countdown(25));
    env.port.pending.clear(); // the OS lost it (reinstall, permission toggled…)
    await env.db.run('DELETE FROM scheduled_notifications');
    await syncTimerNotifications(env.db, env.clock);
    expect(sessionEnds(env.port)).toHaveLength(1);

    env.clock.set(START + 26 * MIN);
    await syncTimerNotifications(env.db, env.clock);
    expect(await listScheduledNotifications(env.db, 'session-end')).toHaveLength(0);
    expect(sessionEnds(env.port)).toHaveLength(0);
  });
});

describe('break-end notification', () => {
  it('is scheduled at the end of the break and cancelled when the break ends', async () => {
    const env = await setup();
    await startBreak(env.db, env.clock, 300);
    const [entry] = pendingOfKind(env.port, 'break-end');
    expect(pendingOfKind(env.port, 'break-end')).toHaveLength(1);
    expect(entry?.at).toBe(START + 5 * MIN);

    await endBreak(env.db, env.clock);
    expect(env.port.pending.size).toBe(0);
  });

  it('is cancelled when a new session starts', async () => {
    const env = await setup();
    await startBreak(env.db, env.clock, 300);
    await startOk(env, countdown(25));
    expect(pendingOfKind(env.port, 'break-end')).toHaveLength(0);
    expect(sessionEnds(env.port)).toHaveLength(1);
  });
});

describe('permission', () => {
  it('is requested once in context, after the channels exist, and never again automatically', async () => {
    const env = await setup('undetermined');
    env.port.promptAnswer = 'denied';
    expect(await requestPermissionInContext(env.db, env.clock)).toBe('denied');
    expect(env.port.requestCount).toBe(1);
    expect(env.port.setupCount).toBeGreaterThanOrEqual(1);

    env.port.permission = 'undetermined';
    await requestPermissionInContext(env.db, env.clock);
    expect(env.port.requestCount).toBe(1);
    expect(await appStateRepo.get(env.db, 'notificationPermissionAsked')).toBe(true);
  });

  it('is not requested when already decided', async () => {
    const env = await setup('granted');
    await requestPermissionInContext(env.db, env.clock);
    expect(env.port.requestCount).toBe(0);
  });

  it('explicit enabling asks again and reschedules what was waiting', async () => {
    const env = await setup('undetermined');
    env.port.promptAnswer = 'denied';
    await requestPermissionInContext(env.db, env.clock);
    await startOk(env, countdown(25));
    expect(env.port.pending.size).toBe(0);

    env.port.promptAnswer = 'granted';
    const status = await enableNotifications(env.db, env.clock);
    expect(status.permission).toBe('granted');
    expect(sessionEnds(env.port)).toHaveLength(1);
  });

  it('reports an unsupported platform (web) without throwing', async () => {
    configureNotifications(noopPort);
    expect(await getNotificationStatus()).toEqual({ supported: false, permission: 'denied', exactAlarm: 'notApplicable' });
  });
});

describe('habit reminders', () => {
  const MWF = maskFromWeekdays([1, 3, 5]);

  async function habit(env: Awaited<ReturnType<typeof setup>>, id: string, reminderTime: string | null, mask = MWF) {
    await createHabitQuest(
      env.db,
      env.clock,
      { id, title: `Habit ${id}`, categoryId: null, weekdaysMask: mask, reminderTime },
      env.newId,
    );
  }

  it('schedules one weekly trigger per planned weekday with the expo weekday', async () => {
    const env = await setup();
    await habit(env, 'h1', '08:30');
    const entries = pendingOfKind(env.port, 'habit-reminder');
    expect(entries.map((entry) => entry.weekly)).toEqual([
      { weekday: 2, hour: 8, minute: 30 }, // Monday
      { weekday: 4, hour: 8, minute: 30 }, // Wednesday
      { weekday: 6, hour: 8, minute: 30 }, // Friday
    ]);
    expect(entries.every((entry) => entry.content.channel === 'reminders')).toBe(true);
    expect((await getHabitReminderSummary(env.db)).scheduled).toBe(3);
  });

  it('maps Sunday to expo weekday 1', async () => {
    const env = await setup();
    await habit(env, 'sun', '19:00', maskFromWeekdays([7]));
    expect(pendingOfKind(env.port, 'habit-reminder').map((entry) => entry.weekly?.weekday)).toEqual([1]);
  });

  it('does not schedule habits without a reminder', async () => {
    const env = await setup();
    await habit(env, 'h1', null);
    expect(env.port.pending.size).toBe(0);
  });

  it('asks the permission in context when a reminder is set', async () => {
    const env = await setup('undetermined');
    await habit(env, 'h1', '08:30');
    expect(env.port.requestCount).toBe(1);
    expect(pendingOfKind(env.port, 'habit-reminder')).toHaveLength(3);
  });

  it('a refused permission keeps the habit and schedules nothing', async () => {
    const env = await setup('undetermined');
    env.port.promptAnswer = 'denied';
    await habit(env, 'h1', '08:30');
    expect((await listHabits(env.db)).map((h) => h.id)).toEqual(['h1']);
    expect(env.port.pending.size).toBe(0);
  });

  it('resync is idempotent: no duplicate, same triggers', async () => {
    const env = await setup();
    await habit(env, 'h1', '08:30');
    await syncHabitReminders(env.db, env.clock);
    await syncHabitReminders(env.db, env.clock);
    expect(pendingOfKind(env.port, 'habit-reminder')).toHaveLength(3);
    expect(await listScheduledNotifications(env.db, 'habit:')).toHaveLength(3);
  });

  it('follows schedule, reminder and archive changes', async () => {
    const env = await setup();
    await habit(env, 'h1', '08:30');

    await updateHabitSchedule(env.db, env.clock, 'h1', { weekdaysMask: maskFromWeekdays([2]) }, env.newId);
    expect(pendingOfKind(env.port, 'habit-reminder').map((entry) => entry.weekly?.weekday)).toEqual([3]);

    await updateHabitReminder(env.db, env.clock, 'h1', '21:15');
    expect(pendingOfKind(env.port, 'habit-reminder').map((entry) => entry.weekly)).toEqual([
      { weekday: 3, hour: 21, minute: 15 },
    ]);

    await updateHabitReminder(env.db, env.clock, 'h1', null);
    expect(env.port.pending.size).toBe(0);

    await updateHabitReminder(env.db, env.clock, 'h1', '07:00');
    await archiveHabitQuest(env.db, env.clock, 'h1');
    expect(env.port.pending.size).toBe(0);
    expect(await listScheduledNotifications(env.db, 'habit:')).toHaveLength(0);
  });

  it('rejects an invalid reminder time', async () => {
    const env = await setup();
    await habit(env, 'h1', null);
    await expect(updateHabitReminder(env.db, env.clock, 'h1', '25:00')).rejects.toThrow();
  });

  it('caps the weekly triggers and reports what is skipped', async () => {
    const env = await setup();
    const cap = PRODUCT.notifications.maxHabitReminders;
    const daily = maskFromWeekdays([1, 2, 3, 4, 5, 6, 7]);
    const habitCount = Math.ceil(cap / 7) + 1;
    for (let index = 0; index < habitCount; index += 1) {
      env.clock.advance(1000); // distinct creation order
      await habit(env, `h${index}`, '08:00', daily);
    }
    expect(pendingOfKind(env.port, 'habit-reminder')).toHaveLength(cap);
    const summary = await getHabitReminderSummary(env.db);
    expect(summary.scheduled).toBe(cap);
    expect(summary.skipped).toBe(habitCount * 7 - cap);
  });

  it('removes the leftovers when the permission is revoked, and restores them when granted', async () => {
    const env = await setup();
    await habit(env, 'h1', '08:30');
    env.port.permission = 'denied';
    await syncHabitReminders(env.db, env.clock);
    expect(await listScheduledNotifications(env.db, 'habit:')).toHaveLength(0);
    env.port.permission = 'granted';
    await syncHabitReminders(env.db, env.clock);
    expect(pendingOfKind(env.port, 'habit-reminder')).toHaveLength(3);
  });
});
