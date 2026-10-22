/** @jest-environment node */
import type { NotificationsPort } from '../port';

const mockNotifications = {
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExactAlarmPermissionsAsync: jest.fn(),
  requestExactAlarmPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'os-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 5, HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date', WEEKLY: 'weekly' },
};

jest.mock('expo-notifications', () => mockNotifications);

function loadPort(os: 'android' | 'ios'): { port: NotificationsPort; showsForegroundBanner: (kind: unknown) => boolean } {
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: os } }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('../expoPort') as typeof import('../expoPort');
  return { port: module.expoPort, showsForegroundBanner: module.showsForegroundBanner };
}

beforeEach(() => jest.clearAllMocks());

describe('expoPort scheduling', () => {
  it('schedules a one-shot DATE trigger on the timer channel with the exact-alarm delivery', async () => {
    const { port } = loadPort('android');
    const id = await port.scheduleAt(
      { title: 'T', body: 'B', kind: 'session-end', channel: 'timer' },
      1_800_000_000_000,
    );
    expect(id).toBe('os-id');
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'T', body: 'B', data: { kind: 'session-end' }, sound: true },
      trigger: { type: 'date', date: 1_800_000_000_000, channelId: 'timer', delivery: 'alarmClock' },
    });
  });

  it('schedules a WEEKLY trigger with the given expo weekday on the reminders channel', async () => {
    const { port } = loadPort('android');
    await port.scheduleWeekly({ title: 'Read', body: 'B', kind: 'habit-reminder', channel: 'reminders' }, 2, 8, 30);
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: 'Read', body: 'B', data: { kind: 'habit-reminder' }, sound: true },
      trigger: { type: 'weekly', weekday: 2, hour: 8, minute: 30, channelId: 'reminders' },
    });
  });

  it('cancels by OS identifier', async () => {
    const { port } = loadPort('ios');
    await port.cancel('os-42');
    expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('os-42');
  });
});

describe('expoPort setup', () => {
  it('creates the Android channels (timer HIGH, reminders DEFAULT) and installs the handler', async () => {
    const { port } = loadPort('android');
    await port.setup();
    expect(mockNotifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith('timer', expect.objectContaining({ importance: 6 }));
    expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'reminders',
      expect.objectContaining({ importance: 5 }),
    );
  });

  it('creates no channel on iOS', async () => {
    const { port } = loadPort('ios');
    await port.setup();
    expect(mockNotifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('the foreground handler hides timer alerts (the UI reacts) and shows habit reminders', async () => {
    const { port, showsForegroundBanner } = loadPort('ios');
    await port.setup();
    const calls = mockNotifications.setNotificationHandler.mock.calls as unknown as [
      { handleNotification: (n: unknown) => Promise<Record<string, boolean>> },
    ][];
    const handler = calls[0]?.[0];
    const withKind = (kind: string) => ({ request: { content: { data: { kind } } } });
    expect(await handler?.handleNotification(withKind('session-end'))).toMatchObject({ shouldShowBanner: false, shouldShowList: false });
    expect(await handler?.handleNotification(withKind('break-end'))).toMatchObject({ shouldShowBanner: false });
    expect(await handler?.handleNotification(withKind('habit-reminder'))).toMatchObject({ shouldShowBanner: true, shouldShowList: true });
    expect(showsForegroundBanner(undefined)).toBe(false);
  });
});

describe('expoPort permissions', () => {
  it('maps the OS status', async () => {
    const { port } = loadPort('ios');
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ granted: true, status: 'granted' });
    expect(await port.getPermission()).toBe('granted');
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'undetermined' });
    expect(await port.getPermission()).toBe('undetermined');
    mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'denied' });
    expect(await port.requestPermission()).toBe('denied');
  });

  it('exact alarm: Android only', async () => {
    const android = loadPort('android').port;
    mockNotifications.getExactAlarmPermissionsAsync.mockResolvedValueOnce({ granted: false });
    expect(await android.getExactAlarm()).toBe('denied');
    mockNotifications.requestExactAlarmPermissionsAsync.mockResolvedValueOnce({ granted: true });
    expect(await android.requestExactAlarm()).toBe('granted');

    const ios = loadPort('ios').port;
    expect(await ios.getExactAlarm()).toBe('notApplicable');
    expect(await ios.requestExactAlarm()).toBe('notApplicable');
  });
});
