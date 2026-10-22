import { Platform } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

export const REAL_DB_NAME = 'tatakae.db';
export const DEMO_DB_NAME = 'tatakae-demo.db';
const ACTIVE_DB_KEY = 'tatakae.activeDb';

type DbName = typeof REAL_DB_NAME | typeof DEMO_DB_NAME;

// expo-sqlite's synchronous kv-store needs SharedArrayBuffer on web (cross-origin isolation),
// which the dev server does not provide; localStorage is the web equivalent.
const read = (): string | null =>
  Platform.OS === 'web' ? globalThis.localStorage?.getItem(ACTIVE_DB_KEY) ?? null : Storage.getItemSync(ACTIVE_DB_KEY);

/**
 * Which database file is active. Stored outside the database (kv-store / localStorage), so
 * switching to the demo database cannot touch real data.
 */
export function getActiveDbName(): DbName {
  return read() === DEMO_DB_NAME ? DEMO_DB_NAME : REAL_DB_NAME;
}

export function setActiveDbName(name: DbName): void {
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(ACTIVE_DB_KEY, name);
  else Storage.setItemSync(ACTIVE_DB_KEY, name);
}
