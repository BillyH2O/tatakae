import { useCallback, useEffect, useState } from 'react';

import type { SqlDb } from '../db/SqlDb';
import { type DataTopic, dataEvents } from '../services/dataEvents';
import { useDb } from './useDb';

export interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * Runs `fetcher` on mount and again whenever one of `topics` is emitted on `dataEvents`
 * (after a write). `fetcher` must be referentially stable (wrap it in `useCallback` with its
 * inputs as dependencies) so that changing inputs trigger a refetch. Stale responses are discarded.
 */
export function useQuery<T>(
  topics: readonly DataTopic[],
  fetcher: (db: SqlDb) => Promise<T>,
): QueryState<T> {
  const db = useDb();
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ data: T | undefined; error: Error | null; loading: boolean }>({
    data: undefined,
    error: null,
    loading: true,
  });
  const topicsKey = topics.join(',');

  useEffect(() => {
    let cancelled = false;
    fetcher(db).then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (error: unknown) => {
        if (cancelled) return;
        setState((prev) => ({
          data: prev.data,
          error: error instanceof Error ? error : new Error(String(error)),
          loading: false,
        }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db, fetcher, tick]);

  useEffect(() => {
    const wanted = topicsKey ? topicsKey.split(',') : [];
    return dataEvents.subscribe((emitted) => {
      if (emitted.some((topic) => wanted.includes(topic))) setTick((value) => value + 1);
    });
  }, [topicsKey]);

  const refresh = useCallback(() => setTick((value) => value + 1), []);
  return { ...state, refresh };
}
