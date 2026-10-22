import type {
  ExactAlarmState,
  NotificationContent,
  NotificationsPort,
  PermissionState,
} from '../services/notifications/port';

export interface PendingNotification {
  id: string;
  content: NotificationContent;
  /** One-shot instant, or null for a weekly trigger. */
  at: number | null;
  weekly: { weekday: number; hour: number; minute: number } | null;
}

export interface FakeNotificationsPort extends NotificationsPort {
  permission: PermissionState;
  /** What a permission prompt answers. */
  promptAnswer: PermissionState;
  exactAlarm: ExactAlarmState;
  pending: Map<string, PendingNotification>;
  requestCount: number;
  setupCount: number;
  /** Every scheduling call ever made (including cancelled ones). */
  scheduledTotal: number;
  failScheduling: boolean;
}

/** In-memory scheduler: `pending` is what the OS would still deliver. */
export function createFakeNotificationsPort(permission: PermissionState = 'granted'): FakeNotificationsPort {
  let seq = 0;
  const port: FakeNotificationsPort = {
    supported: true,
    permission,
    promptAnswer: 'granted',
    exactAlarm: 'granted',
    pending: new Map(),
    requestCount: 0,
    setupCount: 0,
    scheduledTotal: 0,
    failScheduling: false,
    async setup() {
      port.setupCount += 1;
    },
    async getPermission() {
      return port.permission;
    },
    async requestPermission() {
      port.requestCount += 1;
      port.permission = port.promptAnswer;
      return port.permission;
    },
    async scheduleAt(content, at) {
      if (port.failScheduling) throw new Error('scheduler unavailable');
      const id = `os-${++seq}`;
      port.scheduledTotal += 1;
      port.pending.set(id, { id, content, at, weekly: null });
      return id;
    },
    async scheduleWeekly(content, weekday, hour, minute) {
      if (port.failScheduling) throw new Error('scheduler unavailable');
      const id = `os-${++seq}`;
      port.scheduledTotal += 1;
      port.pending.set(id, { id, content, at: null, weekly: { weekday, hour, minute } });
      return id;
    },
    async cancel(id) {
      port.pending.delete(id);
    },
    async getExactAlarm() {
      return port.exactAlarm;
    },
    async requestExactAlarm() {
      return port.exactAlarm;
    },
  };
  return port;
}

export function pendingOfKind(port: FakeNotificationsPort, kind: NotificationContent['kind']): PendingNotification[] {
  return [...port.pending.values()].filter((entry) => entry.content.kind === kind);
}
