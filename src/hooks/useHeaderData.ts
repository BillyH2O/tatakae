import { useMemo } from 'react';

import { getProfile, listDailyGoalVersions, listWeeklyGoalVersions, totalXp } from '../db/repositories';
import type { SqlDb } from '../db/SqlDb';
import { headerTotals, type HeaderTotals, weekRange } from '../domain/totals';
import type { LocalDate } from '../domain/types';
import { levelFromXp } from '../domain/xp';
import { useCrystalBalance } from '../features/crystals';
import { useFocusTotals } from './useFocusTotals';
import { useQuery } from './useQuery';

const loadGoals = async (db: SqlDb) => ({
  daily: await listDailyGoalVersions(db),
  weekly: await listWeeklyGoalVersions(db),
});

export interface HeaderData {
  displayName: string | null;
  avatarUri: string | null;
  level: number;
  crystals: number;
  totals: HeaderTotals;
}

/** Everything the permanent header shows, for the real current day `today`. Undefined while loading. */
export function useHeaderData(today: LocalDate): HeaderData | undefined {
  const week = weekRange(today);
  const byDay = useFocusTotals(week.from, week.to);
  const profile = useQuery(['profile'], getProfile);
  const xp = useQuery(['xp'], totalXp);
  const goals = useQuery(['goals'], loadGoals);
  const crystals = useCrystalBalance();

  return useMemo(() => {
    if (!byDay || profile.loading || xp.data === undefined || !goals.data || crystals === undefined) {
      return undefined;
    }
    const current = profile.data ?? null;
    return {
      displayName: current?.displayName ?? null,
      avatarUri: current?.avatarUri ?? null,
      level: levelFromXp(xp.data).level,
      crystals,
      totals: headerTotals({
        today,
        byDay,
        profileStart: current?.startLocalDate ?? null,
        dailyGoals: goals.data.daily,
        weeklyGoals: goals.data.weekly,
      }),
    };
  }, [byDay, profile.loading, profile.data, xp.data, goals.data, crystals, today]);
}
