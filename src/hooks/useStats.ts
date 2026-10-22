import { useCallback, useMemo } from 'react';

import {
  getProfile,
  listCategories,
  listCountedSessionsStartedBetween,
  listDailyGoalVersions,
  listFocusByCategoryBetween,
  listSessionHistory,
  listWeeklyGoalVersions,
} from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import {
  type GoalContext,
  type HeatmapCell,
  type HistogramBar,
  heatmapGrid,
  heatmapRange,
  histogramBars,
  type PeriodKpis,
  type PeriodRange,
  periodKpis,
  type SessionHistoryItem,
  weekGoalProgress,
  type WeekGoalProgress,
  weeksOfPeriod,
} from '../domain/stats';
import { addDays, startOfLocalDay, startOfNextLocalDay, weekStart } from '../domain/time/localDate';
import { type CategoryBar, type CategoryFocus, categoryBars, liveFocusOnDate } from '../domain/totals';
import type { LocalDate } from '../domain/types';
import { useActiveSession } from './useActiveSession';
import { useFocusTotals } from './useFocusTotals';
import { useNow } from './useNow';
import { useQuery } from './useQuery';

const LIVE_TICK_MS = 1000;

async function loadGoalContext(db: SqlDb): Promise<GoalContext> {
  const [profile, dailyGoals, weeklyGoals] = await Promise.all([
    getProfile(db),
    listDailyGoalVersions(db),
    listWeeklyGoalVersions(db),
  ]);
  return { profileStart: profile?.startLocalDate ?? null, dailyGoals, weeklyGoals };
}

const loadAllCategories = (db: SqlDb) => listCategories(db, { includeArchived: true });

export function useGoalContext(): GoalContext | undefined {
  return useQuery(['goals', 'profile'], loadGoalContext).data;
}

export interface StatsView {
  kpis: PeriodKpis;
  bars: HistogramBar[];
  weeks: WeekGoalProgress[];
  categories: CategoryBar[];
}

/**
 * Everything the Stats screen shows for one period. Totals come from `useFocusTotals` (the same
 * hook as the header and Home) and include the live session; the session count and the average
 * only cover finalized sessions.
 */
export function useStatsView(range: PeriodRange, today: LocalDate): StatsView | undefined {
  // Whole weeks around the period: the month view lists every week touching the month.
  const bufferFrom = weekStart(range.from);
  const bufferTo = addDays(weekStart(range.to), 6);
  const byDay = useFocusTotals(bufferFrom, bufferTo);
  const goals = useGoalContext();
  const active = useActiveSession().data;
  const now = useNow(LIVE_TICK_MS, Boolean(active));

  const sessionsFetcher = useCallback(
    (db: SqlDb) => listCountedSessionsStartedBetween(db, startOfLocalDay(range.from), startOfNextLocalDay(range.to)),
    [range.from, range.to],
  );
  const sessions = useQuery(['sessions'], sessionsFetcher).data;

  const categoryFetcher = useCallback(
    (db: SqlDb) => listFocusByCategoryBetween(db, range.from, range.to),
    [range.from, range.to],
  );
  const categoryRows = useQuery(['sessions'], categoryFetcher).data;
  const categories = useQuery(['categories'], loadAllCategories).data;

  return useMemo(() => {
    if (!byDay || !goals || !sessions || !categoryRows || !categories || active === undefined) return undefined;

    let rows: readonly CategoryFocus[] = categoryRows;
    if (active) {
      const live = { session: active.session, pauses: active.pauses, now };
      let liveSec = 0;
      for (let day = range.from; day <= range.to; day = addDays(day, 1)) liveSec += liveFocusOnDate(live, day);
      if (liveSec > 0) rows = [...categoryRows, { categoryId: active.session.categoryId, focusedSec: liveSec }];
    }

    return {
      kpis: periodKpis(range, byDay, sessions),
      bars: histogramBars(range, today, byDay, goals),
      weeks: weeksOfPeriod(range).map((from) => weekGoalProgress(from, byDay, goals)),
      categories: categoryBars(rows, categories),
    };
  }, [byDay, goals, sessions, categoryRows, categories, active, now, range, today]);
}

/** The 18-week regularity grid (same day states and colors as the Home calendar). */
export function useHeatmap(today: LocalDate): HeatmapCell[][] | undefined {
  const { from, to } = heatmapRange(today);
  const byDay = useFocusTotals(from, to);
  const goals = useGoalContext();
  return useMemo(() => (byDay && goals ? heatmapGrid(today, byDay, goals) : undefined), [byDay, goals, today]);
}

/** Newest finished sessions; `limit + 1` rows are read so the caller knows whether more exist. */
export function useSessionHistory(limit: number): { items: SessionHistoryItem[]; hasMore: boolean } | undefined {
  const fetcher = useCallback((db: SqlDb) => listSessionHistory(db, limit + 1), [limit]);
  const rows = useQuery(['sessions', 'categories', 'quests'], fetcher).data;
  return useMemo(
    () => (rows ? { items: rows.slice(0, limit), hasMore: rows.length > limit } : undefined),
    [rows, limit],
  );
}
