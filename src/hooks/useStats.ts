import { useCallback, useMemo } from 'react';

import {
  getProfile,
  listCategories,
  listCountedSessionsStartedBetween,
  listDailyGoalVersions,
  listFocusByCategoryBetween,
  listHabits,
  listOccurrencesBetween,
  listSessionHistory,
  listWeeklyGoalVersions,
} from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import { PRODUCT } from '../config/product';
import { type HabitHeatCell, type HabitRegularity, habitRegularity, habitRegularityGrid } from '../domain/habits';
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
  sessionInScope,
  type StatsScope,
  weekGoalProgress,
  type WeekGoalProgress,
  weeksOfPeriod,
} from '../domain/stats';
import { addDays, startOfLocalDay, startOfNextLocalDay, weekStart } from '../domain/time/localDate';
import { type CategoryBar, type CategoryFocus, categoryBars, liveFocusOnDate } from '../domain/totals';
import type { Habit, LocalDate } from '../domain/types';
import { useActiveSession } from './useActiveSession';
import { useFocusTotals } from './useFocusTotals';
import { useNow } from './useNow';
import { useQuery } from './useQuery';

const LIVE_TICK_MS = 1000;
const NO_GOALS: GoalContext = { profileStart: null, dailyGoals: [], weeklyGoals: [] };

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
export function useStatsView(range: PeriodRange, today: LocalDate, scope: StatsScope = 'all'): StatsView | undefined {
  // Whole weeks around the period: the month view lists every week touching the month.
  const bufferFrom = weekStart(range.from);
  const bufferTo = addDays(weekStart(range.to), 6);
  const byDay = useFocusTotals(bufferFrom, bufferTo, scope);
  const goals = useGoalContext();
  const active = useActiveSession().data;
  const now = useNow(LIVE_TICK_MS, Boolean(active));

  const sessionsFetcher = useCallback(
    (db: SqlDb) =>
      listCountedSessionsStartedBetween(db, startOfLocalDay(range.from), startOfNextLocalDay(range.to), scope),
    [range.from, range.to, scope],
  );
  const sessions = useQuery(['sessions'], sessionsFetcher).data;

  const categoryFetcher = useCallback(
    (db: SqlDb) => listFocusByCategoryBetween(db, range.from, range.to, scope),
    [range.from, range.to, scope],
  );
  const categoryRows = useQuery(['sessions'], categoryFetcher).data;
  const categories = useQuery(['categories'], loadAllCategories).data;

  return useMemo(() => {
    if (!byDay || !goals || !sessions || !categoryRows || !categories || active === undefined) return undefined;

    let rows: readonly CategoryFocus[] = categoryRows;
    if (active && sessionInScope(scope, active.session)) {
      const live = { session: active.session, pauses: active.pauses, now };
      let liveSec = 0;
      for (let day = range.from; day <= range.to; day = addDays(day, 1)) liveSec += liveFocusOnDate(live, day);
      if (liveSec > 0) rows = [...categoryRows, { categoryId: active.session.categoryId, focusedSec: liveSec }];
    }

    // Goals are about the total focus: a filtered view shows the raw volume, with no goal or score.
    const filtered = scope !== 'all';
    return {
      kpis: periodKpis(range, byDay, sessions),
      bars: histogramBars(range, today, byDay, filtered ? NO_GOALS : goals),
      weeks: filtered ? [] : weeksOfPeriod(range).map((from) => weekGoalProgress(from, byDay, goals)),
      categories: categoryBars(rows, categories),
    };
  }, [byDay, goals, sessions, categoryRows, categories, active, now, range, today, scope]);
}

export interface HabitRegularityView {
  habit: Habit;
  grid: HabitHeatCell[][];
  stats: HabitRegularity;
}

async function loadHabitOccurrences(db: SqlDb, from: LocalDate, to: LocalDate) {
  const [habits, occurrences] = await Promise.all([listHabits(db), listOccurrencesBetween(db, from, to)]);
  return { habits, occurrences };
}

/** One GitHub-style regularity grid per active habit (the last 18 weeks), with its totals and streaks. */
export function useHabitRegularity(today: LocalDate): HabitRegularityView[] | undefined {
  const { from, to } = heatmapRange(today);
  const fetcher = useCallback((db: SqlDb) => loadHabitOccurrences(db, from, to), [from, to]);
  const data = useQuery(['quests'], fetcher).data;
  return useMemo(() => {
    if (!data) return undefined;
    return data.habits.map((habit) => {
      const own = data.occurrences.filter((occurrence) => occurrence.habitId === habit.id);
      const grid = habitRegularityGrid(habit, own, today, PRODUCT.stats.heatmapWeeks);
      return { habit, grid, stats: habitRegularity(grid) };
    });
  }, [data, today]);
}

/** The 18-week regularity grid (same day states and colors as the Home calendar). */
export function useHeatmap(today: LocalDate): HeatmapCell[][] | undefined {
  const { from, to } = heatmapRange(today);
  const byDay = useFocusTotals(from, to);
  const goals = useGoalContext();
  return useMemo(() => (byDay && goals ? heatmapGrid(today, byDay, goals) : undefined), [byDay, goals, today]);
}

/** Newest finished sessions; `limit + 1` rows are read so the caller knows whether more exist. */
export function useSessionHistory(
  limit: number,
  scope: StatsScope = 'all',
): { items: SessionHistoryItem[]; hasMore: boolean } | undefined {
  const fetcher = useCallback((db: SqlDb) => listSessionHistory(db, limit + 1, scope), [limit, scope]);
  const rows = useQuery(['sessions', 'categories', 'quests'], fetcher).data;
  return useMemo(
    () => (rows ? { items: rows.slice(0, limit), hasMore: rows.length > limit } : undefined),
    [rows, limit],
  );
}
