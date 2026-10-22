import { type SQLiteDatabase, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Component, type ReactNode, Suspense, useMemo } from 'react';

import { DbContext } from '../hooks/useDb';
import { en } from '../i18n/en';
import { FullScreenMessage } from '../ui/components/FullScreenMessage';
import { getActiveDbName } from './activeDb';
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

// Must stay referentially stable: a new `onInit` makes SQLiteProvider reopen the database and
// remount everything below it (which resets navigation).
async function initDatabase(raw: SQLiteDatabase) {
  const db = toSqlDb(raw);
  await configureConnection(db);
  await migrate(db);
}

/**
 * Opens the active database, configures the connection, applies migrations, and only then renders
 * children. Failures (including a failed migration, which rolls back) show a calm error screen
 * instead of crashing; stored data is never modified on error.
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const databaseName = useMemo(() => getActiveDbName(), []);

  return (
    <DbErrorBoundary>
      <Suspense fallback={<FullScreenMessage title={en.db.loading} busy />}>
        <SQLiteProvider databaseName={databaseName} useSuspense onInit={initDatabase}>
          <DbBridge>{children}</DbBridge>
        </SQLiteProvider>
      </Suspense>
    </DbErrorBoundary>
  );
}
