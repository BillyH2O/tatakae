import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Component, type ReactNode, Suspense, useMemo } from 'react';

import { DbContext } from '../hooks/useDb';
import { fr } from '../i18n/fr';
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
        <FullScreenMessage title={fr.db.errorTitle} body={fr.db.errorBody} detail={error.message} />
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
 * instead of crashing; stored data is never modified on error.
 */
export function DbProvider({ children }: { children: ReactNode }) {
  const databaseName = useMemo(() => getActiveDbName(), []);

  return (
    <DbErrorBoundary>
      <Suspense fallback={<FullScreenMessage title={fr.db.loading} busy />}>
        <SQLiteProvider
          databaseName={databaseName}
          useSuspense
          onInit={async (raw) => {
            const db = toSqlDb(raw);
            await configureConnection(db);
            await migrate(db);
          }}
        >
          <DbBridge>{children}</DbBridge>
        </SQLiteProvider>
      </Suspense>
    </DbErrorBoundary>
  );
}
