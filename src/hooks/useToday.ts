import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { LocalDate } from '../domain/types';
import { msUntilNextLocalMidnight, toLocalDate } from '../domain/time/localDate';
import { type Clock, systemClock } from '../services/clock';

const MIDNIGHT_MARGIN_MS = 500;

/**
 * The current local day. Updates at local midnight (timer to the next midnight) and when the
 * app returns to the foreground, so "today" never goes stale.
 */
export function useToday(clock: Clock = systemClock): LocalDate {
  const [today, setToday] = useState<LocalDate>(() => toLocalDate(clock.now()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      setToday(toLocalDate(clock.now()));
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, msUntilNextLocalMidnight(clock.now()) + MIDNIGHT_MARGIN_MS);
    };

    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [clock]);

  return today;
}
