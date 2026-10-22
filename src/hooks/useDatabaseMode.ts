import { createContext, useContext } from 'react';

import type { DbName } from '../config/databaseNames';

export interface DatabaseMode {
  /** File the app is connected to (real or demo). */
  name: DbName;
  isDemo: boolean;
  /** Persists the choice, closes the current database and opens the other one (everything below remounts). */
  switchTo: (name: DbName) => void;
}

export const DatabaseModeContext = createContext<DatabaseMode | null>(null);

export function useDatabaseMode(): DatabaseMode {
  const mode = useContext(DatabaseModeContext);
  if (!mode) throw new Error('useDatabaseMode must be used inside <DbProvider>');
  return mode;
}
