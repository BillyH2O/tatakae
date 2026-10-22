import { PRODUCT } from '../config/product';
import type { PriorityMission } from '../config/appStateKeys';
import type { Habit, HabitOccurrence, LocalDate, Task, TaskPriority } from './types';

export interface QuestsConfig {
  todayIncludesOverdue: boolean;
  todayIncludesUndated: boolean;
}

export type QuestTaskRow = {
  task: Task;
  overdue: boolean;
};

export type QuestHabitRow = {
  habit: Habit;
  occurrence: HabitOccurrence;
};

export type QuestRow = { kind: 'task'; task: Task; overdue: boolean } | { kind: 'habit'; habit: Habit; occurrence: HabitOccurrence };

export interface QuestsForDate {
  mission: QuestRow | null;
  active: QuestRow[];
  completed: QuestRow[];
}

const priorityRank = (priority: TaskPriority): number => priority;

function taskTitle(a: Task, b: Task): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

function sortActiveTasks(tasks: QuestTaskRow[]): QuestTaskRow[] {
  return [...tasks].sort(
    (a, b) => priorityRank(b.task.priority) - priorityRank(a.task.priority) || taskTitle(a.task, b.task),
  );
}

function sortCompletedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => taskTitle(a, b));
}

function sortHabits(rows: QuestHabitRow[]): QuestHabitRow[] {
  return [...rows].sort((a, b) => a.habit.title.localeCompare(b.habit.title, undefined, { sensitivity: 'base' }));
}

function rowFromMission(
  mission: PriorityMission,
  tasks: readonly Task[],
  habits: readonly Habit[],
  occurrences: readonly HabitOccurrence[],
  date: LocalDate,
): QuestRow | null {
  if (mission.kind === 'task') {
    const task = tasks.find((t) => t.id === mission.id && t.status !== 'archived');
    if (!task) return null;
    const overdue = Boolean(task.dueDate && task.dueDate < date && task.status === 'open');
    return { kind: 'task', task, overdue };
  }
  const habit = habits.find((h) => h.id === mission.id && h.status === 'active');
  if (!habit) return null;
  const occurrence = occurrences.find((o) => o.habitId === habit.id && o.localDate === date);
  if (!occurrence) return null;
  return { kind: 'habit', habit, occurrence };
}

function isCompleted(row: QuestRow): boolean {
  return row.kind === 'task' ? row.task.status === 'done' : row.occurrence.status === 'done';
}

/** Tasks and habit occurrences shown for `date`, with ordering rules from ARCHITECTURE.md §4.8. */
export function questsForDate(
  date: LocalDate,
  today: LocalDate,
  tasks: readonly Task[],
  habits: readonly Habit[],
  occurrences: readonly HabitOccurrence[],
  mission: PriorityMission | null,
  config: QuestsConfig = PRODUCT.quests,
): QuestsForDate {
  const activeTasks: QuestTaskRow[] = [];
  const completedTasks: Task[] = [];
  const activeHabits: QuestHabitRow[] = [];
  const completedHabits: QuestHabitRow[] = [];

  for (const task of tasks) {
    if (task.status === 'archived') continue;
    if (task.status === 'done') {
      if (task.completedLocalDate === date) completedTasks.push(task);
      continue;
    }
    if (task.dueDate === date) {
      activeTasks.push({ task, overdue: false });
      continue;
    }
    if (date === today && config.todayIncludesOverdue && task.dueDate && task.dueDate < today) {
      activeTasks.push({ task, overdue: true });
      continue;
    }
    if (date === today && config.todayIncludesUndated && task.dueDate === null) {
      activeTasks.push({ task, overdue: false });
    }
  }

  for (const occurrence of occurrences) {
    if (occurrence.localDate !== date) continue;
    const habit = habits.find((h) => h.id === occurrence.habitId);
    if (!habit || habit.status === 'archived') continue;
    const row = { habit, occurrence };
    if (occurrence.status === 'done') completedHabits.push(row);
    else activeHabits.push(row);
  }

  const active: QuestRow[] = [
    ...sortActiveTasks(activeTasks).map((row) => ({ kind: 'task' as const, task: row.task, overdue: row.overdue })),
    ...sortHabits(activeHabits).map((row) => ({ kind: 'habit' as const, ...row })),
  ];
  const completed: QuestRow[] = [
    ...sortCompletedTasks(completedTasks).map((task) => ({ kind: 'task' as const, task, overdue: false })),
    ...sortHabits(completedHabits).map((row) => ({ kind: 'habit' as const, ...row })),
  ];

  const missionRow = mission ? rowFromMission(mission, tasks, habits, occurrences, date) : null;
  const withoutMission = (rows: QuestRow[]) =>
    missionRow ? rows.filter((row) => !sameQuestRow(row, missionRow)) : rows;

  const activeWithout = withoutMission(active);
  const completedWithout = withoutMission(completed);
  const orderedActive = missionRow && !isCompleted(missionRow) ? [missionRow, ...activeWithout] : activeWithout;

  return {
    mission: missionRow && !isCompleted(missionRow) ? missionRow : null,
    active: orderedActive,
    completed: completedWithout,
  };
}

function sameQuestRow(a: QuestRow, b: QuestRow): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'task') return b.kind === 'task' && a.task.id === b.task.id;
  return b.kind === 'habit' && a.occurrence.id === b.occurrence.id;
}

/** Drops missions pointing at archived tasks or inactive habits. */
export function sanitizePriorityMission(
  mission: PriorityMission | null,
  tasks: readonly Task[],
  habits: readonly Habit[],
): PriorityMission | null {
  if (!mission) return null;
  if (mission.kind === 'task') {
    const task = tasks.find((t) => t.id === mission.id);
    return task && task.status === 'open' ? mission : null;
  }
  const habit = habits.find((h) => h.id === mission.id);
  return habit && habit.status === 'active' ? mission : null;
}
