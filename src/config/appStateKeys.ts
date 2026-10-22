/** Keys stored in the `app_state` table (JSON values). */
export const APP_STATE_KEYS = {
  priorityMission: 'priorityMission',
  occurrencesEnsuredThrough: 'occurrencesEnsuredThrough',
  pendingSummarySessionId: 'pendingSummarySessionId',
  activeBreak: 'activeBreak',
} as const;

/** A short break in progress. Never counted as focus, never creates a session. */
export interface ActiveBreak {
  startedAt: number;
  durationSec: number;
}

export type PriorityMission =
  | { kind: 'task'; id: string }
  | { kind: 'habit'; id: string };
