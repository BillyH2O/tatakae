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

/** Tight duration for chart labels: "35m", "1h40", "2h". */
export function formatDurationCompact(totalSec: number): string {
  const minutes = Math.floor(Math.max(0, totalSec) / SEC_PER_MINUTE);
  if (minutes < MIN_PER_HOUR) return `${minutes}m`;
  const hours = Math.floor(minutes / MIN_PER_HOUR);
  const rest = minutes % MIN_PER_HOUR;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
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

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
const WEEKDAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function dateParts(date: string) {
  const [y = 1970, m = 1, d = 1] = date.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7; // 0 = Monday
  return { y, month: m - 1, d, weekday };
}

const shortName = (name: string) => name.slice(0, 3);

/** "19 – 25 Oct 2026", "26 Oct – 1 Nov 2026" or "29 Dec 2026 – 4 Jan 2027". */
export function formatWeekRange(from: string, to: string): string {
  const a = dateParts(from);
  const b = dateParts(to);
  const monthOf = (month: number) => shortName(MONTHS_LONG[month] ?? '');
  if (a.y !== b.y) return `${a.d} ${monthOf(a.month)} ${a.y} – ${b.d} ${monthOf(b.month)} ${b.y}`;
  if (a.month !== b.month) return `${a.d} ${monthOf(a.month)} – ${b.d} ${monthOf(b.month)} ${b.y}`;
  return `${a.d} – ${b.d} ${monthOf(b.month)} ${b.y}`;
}

/** "Thursday 22 October". */
export function formatDayLong(date: string): string {
  const { d, month, weekday } = dateParts(date);
  return `${WEEKDAYS_LONG[weekday] ?? ''} ${d} ${MONTHS_LONG[month] ?? ''}`;
}

/** "Thu 22 Oct". */
export function formatDayShort(date: string): string {
  const { d, month, weekday } = dateParts(date);
  return `${shortName(WEEKDAYS_LONG[weekday] ?? '')} ${d} ${shortName(MONTHS_LONG[month] ?? '')}`;
}

/** "October 2026". */
export function formatMonthYear(date: string): string {
  const { y, month } = dateParts(date);
  return `${MONTHS_LONG[month] ?? ''} ${y}`;
}

export const en = {
  app: {
    name: 'Tatakae',
    tagline: 'Focus and habits',
  },
  db: {
    loading: 'Opening your data…',
    loadingDemo:
      'Opening demo mode… Generating sample data the first time can take up to a minute on web. Please wait.',
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
  demo: {
    banner: 'Demo mode · sample data',
    bannerA11y: 'Demo mode is on. The data shown is generated sample data. Open data settings',
    title: 'Data & demo mode',
    intro:
      'Demo mode opens a separate database filled with random sample data over several weeks, so you can try every screen. Your real data is never touched and is back as soon as you leave.',
    statusReal: 'You are using your real data.',
    statusDemo: 'You are in demo mode: everything you see is generated sample data.',
    enter: 'Enter demo mode',
    leave: 'Back to my real data',
    regenerate: 'Generate new sample data',
    regenerated: 'New sample data generated',
    working: 'Working…',
    sessionActive: 'Finish or stop the current session first.',
    failed: 'Something went wrong. Nothing was changed in your real data.',
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
    notifications: 'Notifications',
    data: 'Data & demo mode',
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
    reminder: 'Reminder (24 h, HH:MM)',
    reminderPlaceholder: 'No reminder',
    reminderInvalid: 'Use a 24 h time such as 08:30, or leave empty.',
    reminderSave: 'Save reminder',
    reminderSaved: 'Reminder updated',
    states: {
      done: 'Done',
      missed: 'Missed',
      planned: 'Planned',
      rest: 'Rest',
      absent: '—',
    },
  },
  notifications: {
    channelTimer: 'Timer',
    channelReminders: 'Habit reminders',
    sessionEndTitle: 'Session complete',
    sessionEndBody: 'Your focus session is over. Nice work.',
    breakEndTitle: 'Break is over',
    breakEndBody: 'Ready for another session?',
    habitBody: 'Time for your habit.',
    title: 'Notifications',
    status: 'Status',
    statusGranted: 'Allowed',
    statusDenied: 'Blocked in system settings',
    statusUndetermined: 'Not requested yet',
    statusUnavailable: 'Not available on this platform',
    explainTimer: 'Session and break alerts are sent when a countdown ends while the app is closed.',
    explainReminders: 'Habit reminders repeat weekly at the time you choose.',
    enable: 'Allow notifications',
    openSystemSettings: 'Open system settings',
    exactAlarm: 'Exact time',
    exactAlarmGranted: 'Alerts arrive at the exact time',
    exactAlarmDenied: 'Alerts may arrive a little late',
    exactAlarmButton: 'Allow exact time',
    reminderCount: (scheduled: number) => `${scheduled} weekly habit reminder${scheduled === 1 ? '' : 's'} scheduled`,
    reminderCapWarning: (skipped: number, cap: number) =>
      `Your system limits scheduled reminders. Only the first ${cap} are active; ${skipped} not scheduled.`,
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
    startSession: 'Free session',
    resumeSession: 'Resume session',
    calendar: {
      previousWeek: 'Previous week',
      nextWeek: 'Next week',
      thisWeek: 'This week',
      weekA11y: (range: string) => `Week of ${range}`,
      rest: 'Rest',
      noGoal: '—',
      inProgressShort: 'now',
      stateScore: (score: number) => `${score} percent`,
      stateInProgress: (score: number) => `${score} percent, in progress`,
      stateFuture: 'no score yet',
      stateRest: 'planned rest day',
      stateNoGoal: 'no goal set',
      selected: 'selected',
    },
    form: {
      title: 'Current form',
      subtitle: 'Last 14 days',
      insufficient: 'Not enough data',
      axes: {
        strength: 'Strength',
        endurance: 'Endurance',
        mental: 'Mental',
        consistency: 'Consistency',
      },
      axesShort: {
        strength: 'STR',
        endurance: 'END',
        mental: 'MEN',
        consistency: 'CON',
      },
      valueA11y: (axis: string, value: number) => `${axis}: ${value} out of 100`,
      noValueA11y: (axis: string) => `${axis}: not enough data`,
      chartA11y: 'Radar chart of your current form over the last 14 days',
      strengthSample: (rated: number) => `${rated} rated session${rated === 1 ? '' : 's'}`,
      strengthMissing: (rated: number, required: number) => `${rated}/${required} rated sessions`,
      enduranceSample: (focusMin: number, goalMin: number) => `${focusMin} of ${goalMin} min planned`,
      enduranceMissing: 'No goal day yet',
      inProgress: 'today in progress',
      mentalSample: (completed: number, closed: number) =>
        `${completed} of ${closed} countdown${closed === 1 ? '' : 's'} completed`,
      mentalMissing: 'No finished countdown yet',
      mentalStops: (stopped: number, reasons: string) =>
        `${stopped} early stop${stopped === 1 ? '' : 's'}${reasons ? `: ${reasons}` : ''}`,
      consistencySample: (achieved: number, planned: number) => `${achieved} of ${planned} goal days reached`,
      consistencyMissing: 'No past goal day yet',
      explain: {
        strength:
          'Average of your optional 1–5 focus ratings × 20 over the last 14 days. Sessions you did not rate are ignored, and it needs at least 3 ratings.',
        endurance:
          'Focus time done on days with a goal, divided by the sum of those goals. Rest days, days without a goal and future days are left out; today counts while it is in progress.',
        mental:
          'Countdown sessions taken to the end, divided by countdown sessions finished. Free stopwatches, manual entries and corrected sessions are excluded.',
        consistency:
          'Past days with a goal where you reached it, divided by those days. Rest days and future days are excluded, and today only counts from tomorrow.',
      },
    },
    categories: {
      title: 'By category',
      empty: 'No session this day',
      seeAll: 'See all',
      uncategorized: 'Uncategorized',
      archived: 'archived',
      fullTitle: 'Focus by category',
      rowA11y: (name: string, duration: string) => `${name}, ${duration}`,
    },
    quests: {
      todayTitle: "Today's quests",
      dayTitle: (day: string) => `Quests · ${day}`,
      empty: 'No quests for this day.',
      seeAll: 'See all quests',
      addQuest: 'Add a quest',
    },
  },
  placeholder: {
    comingSoon: 'Coming in a later step.',
    home: 'Week calendar, current form, focus by category and the selected day’s quests will appear here.',
  },
  stats: {
    title: 'Statistics',
    loading: 'Loading…',
    periodTabs: { week: 'Week', month: 'Month' },
    periodA11y: 'Period',
    previous: 'Previous period',
    next: 'Next period',
    thisPeriod: { week: 'This week', month: 'This month' },
    tiles: {
      total: 'Total focus',
      sessions: 'Sessions',
      average: 'Average duration',
      none: '—',
      a11y: (label: string, value: string) => `${label}: ${value}`,
    },
    histogram: {
      title: 'Per day',
      empty: 'No focus recorded in this period.',
      barA11y: (day: string, focus: string, goal: string | null) =>
        goal === null ? `${day}: ${focus}` : `${day}: ${focus}, goal ${goal}`,
      futureA11y: (day: string) => `${day}: not yet`,
      restA11y: (day: string, focus: string) => `${day}: planned rest day, ${focus}`,
    },
    weekly: {
      title: 'Weekly goal',
      noGoal: 'No weekly goal set.',
      of: (focus: string, goal: string) => `${focus} / ${goal}`,
      percent: (value: number) => `${value}%`,
      a11y: (range: string, focus: string, goal: string | null, percent: number | null) =>
        goal === null ? `${range}: ${focus}, no goal` : `${range}: ${focus} of ${goal}, ${percent ?? 0} percent`,
    },
    categories: { title: 'By category', empty: 'No focus recorded in this period.' },
    heatmap: {
      title: 'Regularity',
      subtitle: (weeks: number) => `Last ${weeks} weeks`,
      a11y: (weeks: number, days: number, reached: number) =>
        `Regularity over the last ${weeks} weeks: goal reached on ${reached} of ${days} scored days`,
      less: 'Less',
      more: 'More',
    },
    last: {
      title: 'Last session',
      none: 'No session yet.',
      when: (day: string, time: string) => `${day} · ${time}`,
    },
    history: {
      open: 'History',
      title: 'Session history',
      empty: 'No session yet. Start one, or add a past session by hand.',
      loadMore: 'Show more',
      endsAt: (start: string, end: string) => `${start} – ${end}`,
      rated: (rating: number) => `Rated ${rating}/5`,
      archived: 'archived',
      uncategorized: 'Uncategorized',
      badges: {
        manual: 'Manual entry',
        corrected: 'Corrected',
        stopwatch: 'Free timer',
        stoppedEarly: 'Stopped early',
      },
      rowA11y: (day: string, duration: string, category: string, badges: string) =>
        `${day}, ${duration}, ${category}${badges ? `, ${badges}` : ''}. Edit`,
    },
    add: 'Add a session',
    form: {
      newTitle: 'Add a session',
      editTitle: 'Correct a session',
      date: 'Date',
      today: 'Today',
      startTime: 'Start time (HH:MM)',
      duration: 'Duration (minutes)',
      category: 'Category',
      noCategory: 'None',
      quest: 'Quest (optional)',
      noQuest: 'None',
      save: 'Save session',
      saveCorrection: 'Save correction',
      xpDelta: (delta: number) => (delta === 0 ? 'XP unchanged' : `${delta > 0 ? '+' : ''}${delta} XP`),
      originalNote: (day: string, time: string) => `Started ${day} at ${time}. The start time cannot be changed.`,
      correctionNote:
        'A corrected session is marked as “Corrected”, no longer counts for Mental, and its XP follows the new duration.',
      overlapTitle: 'Overlaps another session',
      overlapBody: 'This entry overlaps a session you already recorded. Save it anyway?',
      overlapConfirm: 'Save anyway',
      errors: {
        invalid_time: 'Enter a time like 09:30.',
        too_short: (minutes: number) => `A session lasts at least ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        too_long: (minutes: number) => `A session lasts at most ${minutes} minutes.`,
        in_future: 'A session cannot end in the future.',
        not_a_number: 'Enter the duration in minutes.',
        not_found: 'This session no longer exists or is still running.',
        overlap: 'This entry overlaps another session.',
        failed: 'Something went wrong. Nothing was saved.',
      },
    },
  },
  common: {
    back: 'Back',
    cancel: 'Cancel',
  },
} as const;
