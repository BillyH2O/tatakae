import { useCallback, useRef, useState } from 'react';

/**
 * Prevents a double tap from running an async action twice: while one call is in flight, further
 * calls are ignored and `busy` is true so buttons can be disabled. (Services are idempotent too.)
 */
export function useSingleFlight(): [busy: boolean, run: (action: () => Promise<void>) => Promise<void>] {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  return [busy, run];
}
