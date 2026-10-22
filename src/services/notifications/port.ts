export type PermissionState = 'granted' | 'denied' | 'undetermined';

/** `notApplicable`: not Android, or Android below 12 (always exact). */
export type ExactAlarmState = 'granted' | 'denied' | 'notApplicable';

export type NotificationChannel = 'timer' | 'reminders';
export type NotificationKind = 'session-end' | 'break-end' | 'habit-reminder';

export interface NotificationContent {
  title: string;
  body: string;
  kind: NotificationKind;
  channel: NotificationChannel;
}

/**
 * Narrow boundary over the OS notification scheduler. The service and its tests only know this
 * interface; `expoPort.ts` is the single file that touches `expo-notifications`.
 */
export interface NotificationsPort {
  /** False on web: nothing can be scheduled, and the UI says so. */
  readonly supported: boolean;
  /** Foreground handler and Android channels. Must run before the first permission request. */
  setup(): Promise<void>;
  getPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  /** One-shot notification at an absolute instant. Resolves to the OS notification id. */
  scheduleAt(content: NotificationContent, atMs: number): Promise<string>;
  /** Weekly repeating notification. `weekday` follows expo: 1 = Sunday … 7 = Saturday. */
  scheduleWeekly(content: NotificationContent, weekday: number, hour: number, minute: number): Promise<string>;
  cancel(notificationId: string): Promise<void>;
  getExactAlarm(): Promise<ExactAlarmState>;
  requestExactAlarm(): Promise<ExactAlarmState>;
}

/** Web and any platform without a scheduler: every call is a harmless no-op. */
export const noopPort: NotificationsPort = {
  supported: false,
  setup: async () => undefined,
  getPermission: async () => 'denied',
  requestPermission: async () => 'denied',
  scheduleAt: async () => {
    throw new Error('Notifications are not available on this platform');
  },
  scheduleWeekly: async () => {
    throw new Error('Notifications are not available on this platform');
  },
  cancel: async () => undefined,
  getExactAlarm: async () => 'notApplicable',
  requestExactAlarm: async () => 'notApplicable',
};
