import { PRODUCT } from '../config/product';
import { SETTINGS_KEYS } from '../config/settingsKeys';
import { settingsRepo } from '../db/repositories/keyValue';
import type { SqlDb } from '../db/SqlDb';
import { dataEvents } from './dataEvents';
import type { Clock } from './clock';

export interface TimerSettings {
  defaultFocusMin: number;
  defaultBreakMin: number;
  keepScreenOn: boolean;
}

export async function getTimerSettings(db: SqlDb): Promise<TimerSettings> {
  const focus = await settingsRepo.get<number>(db, SETTINGS_KEYS.timerDefaultFocusMin);
  const brk = await settingsRepo.get<number>(db, SETTINGS_KEYS.timerDefaultBreakMin);
  const keepOn = await settingsRepo.get<boolean>(db, SETTINGS_KEYS.timerKeepScreenOn);
  return {
    defaultFocusMin: focus ?? PRODUCT.timer.defaultFocusMin,
    defaultBreakMin: brk ?? PRODUCT.timer.defaultBreakMin,
    keepScreenOn: keepOn ?? PRODUCT.timer.keepScreenOnDefault,
  };
}

export async function saveTimerSettings(db: SqlDb, clock: Clock, value: TimerSettings): Promise<void> {
  const now = clock.now();
  await db.transaction(async (tx) => {
    await settingsRepo.set(tx, SETTINGS_KEYS.timerDefaultFocusMin, value.defaultFocusMin, now);
    await settingsRepo.set(tx, SETTINGS_KEYS.timerDefaultBreakMin, value.defaultBreakMin, now);
    await settingsRepo.set(tx, SETTINGS_KEYS.timerKeepScreenOn, value.keepScreenOn, now);
  });
  dataEvents.emit('settings');
}
