import type { Clock } from '../services/clock';

export interface FakeClock extends Clock {
  set(ms: number): void;
  advance(ms: number): void;
}

export function createFakeClock(start: number): FakeClock {
  let current = start;
  return {
    now: () => current,
    set: (ms) => {
      current = ms;
    },
    advance: (ms) => {
      current += ms;
    },
  };
}

/** Deterministic id generator: `id-1`, `id-2`, … */
export function createSequentialIds(prefix = 'id'): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
