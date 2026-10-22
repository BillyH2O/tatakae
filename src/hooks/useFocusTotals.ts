import { useCallback, useMemo } from 'react';

import { listFocusByDay } from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import { buildFocusByDay, type FocusByDay } from '../domain/totals';
import type { LocalDate } from '../domain/types';
import { useQuery } from './useQuery';

/** The only source of focus totals for the UI (header, Home, Stats). */
export function useFocusTotals(from: LocalDate, to: LocalDate): FocusByDay | undefined {
  const fetcher = useCallback((db: SqlDb) => listFocusByDay(db, from, to), [from, to]);
  const { data } = useQuery(['sessions'], fetcher);
  return useMemo(() => (data ? buildFocusByDay(data) : undefined), [data]);
}
