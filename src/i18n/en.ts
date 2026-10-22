/** All user-facing strings (English). Code, types and SQL stay in English too. */

const SEC_PER_MINUTE = 60;
const MIN_PER_HOUR = 60;

/** Focus duration for display: "25 min", "2 h", "1 h 05". Partial minutes are floored. */
export function formatDuration(totalSec: number): string {
  const minutes = Math.floor(Math.max(0, totalSec) / SEC_PER_MINUTE);
  if (minutes < MIN_PER_HOUR) return `${minutes} min`;
  const hours = Math.floor(minutes / MIN_PER_HOUR);
  const rest = minutes % MIN_PER_HOUR;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

export const en = {
  app: {
    name: 'Tatakae',
    tagline: 'Focus and habits',
  },
  db: {
    loading: 'Opening your data…',
    errorTitle: 'Unable to open your data',
    errorBody:
      'Something went wrong while opening the local database. Your data has not been changed. Restart the app; if the problem persists, report the error below.',
    retry: 'Try again',
    ready: (version: number) => `Local database ready · schema v${version}`,
  },
  tabs: {
    home: 'Home',
    quests: 'Quests',
    stats: 'Stats',
    profile: 'Profile',
  },
  header: {
    defaultName: 'Adventurer',
    level: (level: number) => `Lvl ${level}`,
    levelA11y: (level: number) => `Level ${level}`,
    crystalsA11y: (balance: number) => `${balance} crystals`,
    today: 'Today',
    week: 'Week',
    focusOfGoal: (focus: string, goal: string) => `${focus} / ${goal}`,
    openProfile: 'Open profile',
    openStatsA11y: (label: string, value: string) => `${label}: ${value}. Open weekly stats`,
  },
  placeholder: {
    comingSoon: 'Coming in a later step.',
    home: 'Week calendar, current form, focus by category and the selected day’s quests will appear here.',
    quests: 'Tasks and habits will appear here.',
    stats: (period: string) => `Statistics for the ${period} will appear here.`,
    profile: 'Profile, level, XP and settings will appear here.',
  },
  stats: {
    period: { week: 'week', month: 'month' },
  },
} as const;
