import { type SQLiteDatabase, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Component, type ReactNode, Suspense, useCallback, useMemo, useState } from 'react';

import { type DbName, DEMO_DB_NAME } from '../config/databaseNames';
import { DatabaseModeContext } from '../hooks/useDatabaseMode';
import { DbContext } from '../hooks/useDb';
import { en } from '../i18n/en';
import { systemClock } from '../services/clock';
import { ensureDemoSeeded } from '../services/demo/seedDemo';
import { newId } from '../services/ids';
import { FullScreenMessage } from '../ui/components/FullScreenMessage';
import { getActiveDbName, setActiveDbName } from './activeDb';
import { configureConnection, toSqlDb } from './expoSqlDb';
import { migrate } from './migrate';

class DbErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <FullScreenMessage title={en.db.errorTitle} body={en.db.errorBody} detail={error.message} />
      );
    }
    return this.props.children;
  }
}

function DbBridge({ children }: { children: ReactNode }) {
  const raw = useSQLiteContext();
  const db = useMemo(() => toSqlDb(raw), [raw]);
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

/**
 * Opens the active database, configures the connection, applies migrations, and only then renders
 * children. Failures (including a failed migration, which rolls back) show a calm error screen
 * instead of crashing; stored data is never modified on error. The demo database is generated
 * here the first time it is opened. Switching between real and demo remounts everything below.
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const [databaseName, setDatabaseName] = useState<DbName>(() => getActiveDbName());

  // Must stay referentially stable per database: a new `onInit` makes SQLiteProvider reopen the
  // database and remount everything below it (which resets navigation).
  const initDatabase = useMemo(
    () => async (raw: SQLiteDatabase) => {
      const db = toSqlDb(raw);
      await configureConnection(db);
      await migrate(db);
      await ensureDemoSeeded(db, systemClock, newId, databaseName);
    },
    [databaseName],
  );

  const switchTo = useCallback((name: DbName) => {
    setActiveDbName(name);
    setDatabaseName(name);
  }, []);

  const mode = useMemo(
    () => ({ name: databaseName, isDemo: databaseName === DEMO_DB_NAME, switchTo }),
    [databaseName, switchTo],
  );

  return (
    <DatabaseModeContext.Provider value={mode}>
      <DbErrorBoundary key={databaseName}>
        <Suspense
          fallback={
            <FullScreenMessage
              title={databaseName === DEMO_DB_NAME ? en.db.loadingDemo : en.db.loading}
              busy
            />
          }
        >
          <SQLiteProvider databaseName={databaseName} useSuspense onInit={initDatabase}>
            <DbBridge>{children}</DbBridge>
          </SQLiteProvider>
        </Suspense>
      </DbErrorBoundary>
    </DatabaseModeContext.Provider>
  );
}
