import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { type Clock, systemClock } from '../services/clock';

/**
 * Current instant, refreshed every `intervalMs` while `enabled`, and when the app returns to the
 * foreground. Used only for rendering: all timer values are derived from stored timestamps, so a
 * frozen `setInterval` in the background never changes the result.
 */
export function useNow(intervalMs = 250, enabled = true, clock: Clock = systemClock): number {
  const [now, setNow] = useState(() => clock.now());

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => setNow(clock.now()), intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(clock.now());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [clock, enabled, intervalMs]);

  return now;
}
