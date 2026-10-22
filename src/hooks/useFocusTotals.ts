import { useCallback, useMemo } from 'react';

import { listFocusByDay } from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import { type StatsScope, sessionInScope } from '../domain/stats';
import { buildFocusByDay, type FocusByDay } from '../domain/totals';
import type { LocalDate } from '../domain/types';
import { useActiveSession } from './useActiveSession';
import { useNow } from './useNow';
import { useQuery } from './useQuery';

const LIVE_TICK_MS = 1000;

/**
 * The only source of focus totals for the UI (header, Home, Stats): finalized sessions from the
 * database plus the live focus of the active session, ticking while one is running. `scope` limits it
 * to habit sessions or to the others (Stats filter); the header and Home always use `all`.
 */
export function useFocusTotals(from: LocalDate, to: LocalDate, scope: StatsScope = 'all'): FocusByDay | undefined {
  const fetcher = useCallback((db: SqlDb) => listFocusByDay(db, from, to, scope), [from, to, scope]);
  const { data } = useQuery(['sessions'], fetcher);
  const active = useActiveSession().data;
  const now = useNow(LIVE_TICK_MS, Boolean(active));

  return useMemo(() => {
    if (!data || active === undefined) return undefined;
    const live = active && sessionInScope(scope, active.session) ? { session: active.session, pauses: active.pauses, now } : null;
    return buildFocusByDay(data, live);
  }, [data, active, now, scope]);
}
