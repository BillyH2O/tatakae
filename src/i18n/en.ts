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

/** Timer face: "04:05" or "1:02:03". */
export function formatClock(totalSec: number): string {
  const total = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / SEC_PER_MINUTE);
  const seconds = total % SEC_PER_MINUTE;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Local time of day for an instant: "14:05". */
export function formatTimeOfDay(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
  weekdays: {
    short: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const,
  },
  onboarding: {
    title: 'Welcome to Tatakae',
    subtitle: 'Set up your profile and daily goals. You can change them later in Settings.',
    nameLabel: 'Nickname',
    namePlaceholder: 'Your name',
    nameInvalid: (max: number) => `Enter 1–${max} characters.`,
    photoAdd: 'Add photo',
    photoChange: 'Change photo',
    photoSkip: 'Skip photo',
    dailyGoals: 'Daily focus goals',
    weeklyGoal: 'Weekly goal (minutes)',
    weeklyHint: 'Default is the sum of your daily goals.',
    start: 'Start',
    goalModes: { goal: 'Goal', none: 'No goal', rest: 'Rest' },
    minutes: (n: number) => `${n} min`,
  },
  profile: {
    editName: 'Edit nickname',
    saveName: 'Save',
    changePhoto: 'Change photo',
    xpProgress: (into: number, next: number) => `${into} / ${next} XP to next level`,
    crystals: 'Crystals',
    statsTitle: 'Lifetime',
    totalFocus: 'Total focus',
    sessions: 'Sessions',
    activeDays: 'Active days',
    settings: 'Settings',
  },
  settings: {
    title: 'Settings',
    goals: 'Goals',
    categories: 'Categories',
    timer: 'Session & break',
    goalsTitle: 'Daily & weekly goals',
    appliesFromToday: 'Applies from today',
    weeklyGoalMin: 'Weekly goal (minutes)',
    noWeeklyGoal: 'No weekly goal',
    save: 'Save changes',
    saved: 'Goals updated',
    timerTitle: 'Timer defaults',
    defaultFocus: 'Default focus duration',
    defaultBreak: 'Short break duration',
    keepScreenOn: 'Keep screen on during sessions',
    keepScreenOff: 'Off',
    keepScreenOnLabel: 'On',
    categoriesTitle: 'Categories',
    addCategory: 'Add category',
    archive: 'Archive',
    restore: 'Restore',
    archived: 'Archived categories',
    nameLabel: 'Name',
    duplicateName: 'A category with this name already exists.',
    uncategorizedNote: '“Uncategorized” is built in and cannot be edited here.',
  },
  quests: {
    title: 'Quests',
    today: 'Today',
    all: 'All',
    priorityMission: 'Priority mission',
    tasks: 'Tasks',
    habits: 'Habits',
    completed: 'Completed',
    overdue: 'Overdue',
    emptyToday: 'No quests for today. Add your first task or habit.',
    addQuest: 'Add a quest',
    start: 'Start',
    setMission: 'Set as mission',
    weekProgress: (done: number, planned: number) => `${done}/${planned} this week`,
    newTask: 'New task',
    newHabit: 'New habit',
    taskTitle: 'Title',
    habitDays: 'Planned days',
    priority: { low: 'Low', normal: 'Normal', high: 'High' },
    dueDate: 'Due date',
    noDueDate: 'No date',
    dueToday: 'Today',
    dueTomorrow: 'Tomorrow',
    complete: 'Complete',
    reopen: 'Reopen',
    archive: 'Archive',
    habitDetail: 'Habit',
    taskDetail: 'Task',
    calendarLegend: 'Tap a day for its status.',
    states: {
      done: 'Done',
      missed: 'Missed',
      planned: 'Planned',
      rest: 'Rest',
      absent: '—',
    },
  },
  focus: {
    title: 'Focus',
    blockingUnavailable: 'Distraction blocking is not available in this version',
    freeSession: 'Free session',
    prepare: {
      quest: 'Quest',
      noQuest: 'No quest',
      clearQuest: 'Remove quest',
      category: 'Category',
      uncategorized: 'Uncategorized',
      mode: 'Mode',
      countdown: 'Countdown',
      stopwatch: 'Free stopwatch',
      duration: 'Duration',
      decrease: 'Shorter',
      increase: 'Longer',
      start: 'Start session',
      alreadyActive: 'A session is already running.',
      stopwatchHint: 'No limit. You decide when to finish.',
    },
    running: {
      countdownLabel: (minutes: number) => `${minutes} min session`,
      stopwatchLabel: 'Free stopwatch',
      paused: 'Paused',
      pause: 'Pause',
      resume: 'Resume',
      finish: 'Finish',
      discard: 'Discard',
      tooShort: 'Under 1 minute: nothing is saved yet.',
      finishTitle: 'Finish this session?',
      finishBody: (focus: string) => `You focused for ${focus}. It will be saved.`,
      reasonLabel: 'Reason (optional)',
      reasons: {
        interrupted: 'Interrupted',
        tired: 'Tired',
        quest_done: 'Quest done',
        other: 'Other',
      },
      confirmFinish: 'Save and finish',
      keepGoing: 'Keep going',
      discardTitle: 'Discard this session?',
      discardBody: 'Nothing will be saved.',
      confirmDiscard: 'Discard',
      timerA11y: (time: string) => `Timer ${time}`,
    },
    stopwatchGap: {
      title: 'Welcome back',
      body: (elapsed: string) =>
        `Your stopwatch was left open and shows ${elapsed}. Choose what to keep before anything is recorded.`,
      keepAll: (elapsed: string) => `Keep ${elapsed}`,
      untilLastSeen: (time: string) => `Keep until ${time} (last activity)`,
      enterDuration: 'Enter a duration',
      durationLabel: (max: number) => `Minutes (up to ${max})`,
      save: 'Save',
      invalidDuration: 'Enter a number of minutes.',
    },
    summary: {
      completeTitle: 'Session complete',
      savedTitle: 'Session saved',
      focused: 'Focus time',
      xp: (amount: number) => `+${amount} XP`,
      ratingTitle: 'How focused did you feel?',
      ratingOptional: 'Optional',
      ratingA11y: (value: number, max: number) => `${value} out of ${max}`,
      skip: 'Skip',
      questLabel: 'Quest',
      completeQuest: 'Complete quest',
      questCompleted: 'Quest completed',
      takeBreak: (minutes: number) => `${minutes} min break`,
      newSession: 'New session',
      close: 'Close',
      notFound: 'This session could not be found.',
    },
    break: {
      title: 'Break',
      subtitle: 'Not counted as focus.',
      over: 'Break over',
      overBody: 'Ready when you are. The next session only starts when you choose.',
      startSession: 'Start a session',
      end: 'End break',
    },
  },
  home: {
    startSession: 'Start a session',
    resumeSession: 'Resume session',
  },
  placeholder: {
    comingSoon: 'Coming in a later step.',
    home: 'Week calendar, current form, focus by category and the selected day’s quests will appear here.',
    stats: (period: string) => `Statistics for the ${period} will appear here.`,
  },
  stats: {
    period: { week: 'week', month: 'month' },
  },
  common: {
    back: 'Back',
    cancel: 'Cancel',
  },
} as const;
