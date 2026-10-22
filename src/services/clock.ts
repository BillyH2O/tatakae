/** Injected everywhere instead of calling `Date.now()` directly, so tests can control time. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };
