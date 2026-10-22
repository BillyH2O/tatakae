/** Keys stored in the `app_state` table (JSON values). */
export const APP_STATE_KEYS = {
  priorityMission: 'priorityMission',
  occurrencesEnsuredThrough: 'occurrencesEnsuredThrough',
} as const;

export type PriorityMission =
  | { kind: 'task'; id: string }
  | { kind: 'habit'; id: string };
