import { expoPort } from './expoPort';
import type { NotificationsPort } from './port';

/** Native (iOS / Android): the `expo-notifications` adapter. Web uses `createPort.web.ts`. */
export function createNotificationsPort(): NotificationsPort {
  return expoPort;
}
