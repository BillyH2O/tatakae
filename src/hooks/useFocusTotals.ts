import { useCallback, useMemo } from 'react';

import { listFocusByDay } from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import { buildFocusByDay, type FocusByDay } from '../domain/totals';
import type { LocalDate } from '../domain/types';
import { useActiveSession } from './useActiveSession';
import { useNow } from './useNow';
import { useQuery } from './useQuery';

const LIVE_TICK_MS = 1000;

/**
 * The only source of focus totals for the UI (header, Home, Stats): finalized sessions from the
 * database plus the live focus of the active session, ticking while one is running.
 */
export function useFocusTotals(from: LocalDate, to: LocalDate): FocusByDay | undefined {
  const fetcher = useCallback((db: SqlDb) => listFocusByDay(db, from, to), [from, to]);
  const { data } = useQuery(['sessions'], fetcher);
  const active = useActiveSession().data;
  const now = useNow(LIVE_TICK_MS, Boolean(active));

  return useMemo(() => {
    if (!data || active === undefined) return undefined;
    const live = active ? { session: active.session, pauses: active.pauses, now } : null;
    return buildFocusByDay(data, live);
  }, [data, active, now]);
}
