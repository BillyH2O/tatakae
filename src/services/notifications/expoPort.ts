import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { en } from '../../i18n/en';
import type {
  ExactAlarmState,
  NotificationContent,
  NotificationKind,
  NotificationsPort,
  PermissionState,
} from './port';

/** Channel ids are stable: renaming one would orphan the user's per-channel system settings. */
export const CHANNEL_IDS = { timer: 'timer', reminders: 'reminders' } as const;

/** In the foreground the timer UI already reacts (haptic + summary): only reminders show a banner. */
export function showsForegroundBanner(kind: unknown): boolean {
  const known: NotificationKind | undefined =
    kind === 'session-end' || kind === 'break-end' || kind === 'habit-reminder' ? kind : undefined;
  return known === 'habit-reminder';
}

function toPermissionState(response: { granted: boolean; status: string }): PermissionState {
  if (response.granted) return 'granted';
  return response.status === 'undetermined' ? 'undetermined' : 'denied';
}

function toExactAlarmState(response: { granted: boolean }): ExactAlarmState {
  return response.granted ? 'granted' : 'denied';
}

const isAndroid = Platform.OS === 'android';

export const expoPort: NotificationsPort = {
  supported: true,

  async setup() {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const show = showsForegroundBanner(notification.request.content.data?.kind);
        return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: false, shouldSetBadge: false };
      },
    });
    if (isAndroid) {
      await Notifications.setNotificationChannelAsync(CHANNEL_IDS.timer, {
        name: en.notifications.channelTimer,
        importance: AndroidImportance.HIGH,
      });
      await Notifications.setNotificationChannelAsync(CHANNEL_IDS.reminders, {
        name: en.notifications.channelReminders,
        importance: AndroidImportance.DEFAULT,
      });
    }
  },

  async getPermission() {
    return toPermissionState(await Notifications.getPermissionsAsync());
  },

  async requestPermission() {
    return toPermissionState(await Notifications.requestPermissionsAsync());
  },

  scheduleAt(content: NotificationContent, atMs: number) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: { kind: content.kind },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: atMs,
        channelId: CHANNEL_IDS[content.channel],
        // The timer end is time-critical; without the exact-alarm permission Android falls back to best effort.
        delivery: content.kind === 'habit-reminder' ? 'bestEffort' : 'alarmClock',
      },
    });
  },

  scheduleWeekly(content: NotificationContent, weekday: number, hour: number, minute: number) {
    return Notifications.scheduleNotificationAsync({
      content: { title: content.title, body: content.body, data: { kind: content.kind }, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
        channelId: CHANNEL_IDS[content.channel],
      },
    });
  },

  cancel(notificationId: string) {
    return Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  async getExactAlarm() {
    if (!isAndroid) return 'notApplicable';
    return toExactAlarmState(await Notifications.getExactAlarmPermissionsAsync());
  },

  async requestExactAlarm() {
    if (!isAndroid) return 'notApplicable';
    return toExactAlarmState(await Notifications.requestExactAlarmPermissionsAsync());
  },
};
