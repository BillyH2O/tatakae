import { createContext, useContext } from 'react';

import type { SqlDb } from '../db/SqlDb';

export const DbContext = createContext<SqlDb | null>(null);

export function useDb(): SqlDb {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used inside <DbProvider>');
  return db;
}
