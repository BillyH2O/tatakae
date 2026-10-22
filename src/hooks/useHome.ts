import { useCallback, useMemo } from 'react';

import {
  getProfile,
  listCategories,
  listDailyGoalVersions,
  listFocusByCategory,
  listRadarSessions,
} from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import { resolveDayGoal } from '../domain/goals';
import { computeRadar, radarWindowStart, type RadarAxisResult } from '../domain/radar';
import { type DayCellState, dayCellState } from '../domain/scores';
import { addDays, startOfLocalDay, startOfNextLocalDay, weekDays } from '../domain/time/localDate';
import { type CategoryBar, categoryBars, liveFocusOnDate } from '../domain/totals';
import type { LocalDate } from '../domain/types';
import { useActiveSession } from './useActiveSession';
import { useFocusTotals } from './useFocusTotals';
import { useNow } from './useNow';
import { useQuery } from './useQuery';

const LIVE_TICK_MS = 1000;

async function loadGoalContext(db: SqlDb) {
  const [daily, profile] = await Promise.all([listDailyGoalVersions(db), getProfile(db)]);
  return { daily, profileStart: profile?.startLocalDate ?? null };
}

export interface DayCellData {
  date: LocalDate;
  state: DayCellState;
}

/** The seven cells of the week starting on `weekFrom` (a Monday). One query for the whole week. */
export function useDayCells(weekFrom: LocalDate, today: LocalDate): DayCellData[] | undefined {
  const byDay = useFocusTotals(weekFrom, addDays(weekFrom, 6));
  const goals = useQuery(['goals', 'profile'], loadGoalContext).data;

  return useMemo(() => {
    if (!byDay || !goals) return undefined;
    return weekDays(weekFrom).map((date) => {
      const goal = goals.profileStart
        ? resolveDayGoal(date, goals.daily, goals.profileStart)
        : ({ kind: 'none' } as const);
      return { date, state: dayCellState(date, today, goal, byDay.get(date) ?? 0) };
    });
  }, [byDay, goals, weekFrom, today]);
}

/** "Current form": the four radar axes over the 14 days ending today, whatever day is selected. */
export function useRadar(today: LocalDate): RadarAxisResult[] | undefined {
  const from = radarWindowStart(today);
  const byDay = useFocusTotals(from, today);
  const goals = useQuery(['goals', 'profile'], loadGoalContext).data;
  const sessionsFetcher = useCallback(
    (db: SqlDb) => listRadarSessions(db, startOfLocalDay(from), startOfNextLocalDay(today)),
    [from, today],
  );
  const sessions = useQuery(['sessions'], sessionsFetcher).data;

  return useMemo(() => {
    if (!byDay || !goals || !sessions) return undefined;
    return computeRadar({
      today,
      sessions,
      byDay,
      dailyGoals: goals.daily,
      profileStart: goals.profileStart,
    });
  }, [byDay, goals, sessions, today]);
}

const loadAllCategories = (db: SqlDb) => listCategories(db, { includeArchived: true });

/** Focus per category for `date`: finalized sessions plus the live session when it falls on that day. */
export function useCategoryBars(date: LocalDate): CategoryBar[] | undefined {
  const fetcher = useCallback((db: SqlDb) => listFocusByCategory(db, date), [date]);
  const rows = useQuery(['sessions'], fetcher).data;
  const categories = useQuery(['categories'], loadAllCategories).data;
  const active = useActiveSession().data;
  const now = useNow(LIVE_TICK_MS, Boolean(active));

  return useMemo(() => {
    if (!rows || !categories || active === undefined) return undefined;
    const live = active
      ? liveFocusOnDate({ session: active.session, pauses: active.pauses, now }, date)
      : 0;
    const all = live > 0 ? [...rows, { categoryId: active?.session.categoryId ?? null, focusedSec: live }] : rows;
    return categoryBars(all, categories);
  }, [rows, categories, active, now, date]);
}
