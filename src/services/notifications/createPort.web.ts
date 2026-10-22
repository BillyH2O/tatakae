import { type NotificationsPort, noopPort } from './port';

/** Web has no background scheduler: notifications are a no-op and the settings screen says so. */
export function createNotificationsPort(): NotificationsPort {
  return noopPort;
}
