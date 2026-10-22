import { asLocalDate as d } from '../time/localDate';
import { questsForDate, sanitizePriorityMission } from '../quests';
import type { Task } from '../types';

const today = d('2026-10-22');

const task = (partial: Partial<Task> & Pick<Task, 'id' | 'title'>): Task => ({
  categoryId: null,
  dueDate: null,
  priority: 1,
  status: 'open',
  completedAt: null,
  completedLocalDate: null,
  createdAt: 0,
  updatedAt: 0,
  ...partial,
});

describe('questsForDate', () => {
  it('includes overdue tasks on today only', () => {
    const tasks = [task({ id: 't1', title: 'Late', dueDate: d('2026-10-21') })];
    const view = questsForDate(today, today, tasks, [], [], null);
    expect(view.active).toHaveLength(1);
    expect(view.active[0]?.kind).toBe('task');
    if (view.active[0]?.kind === 'task') expect(view.active[0].overdue).toBe(true);

    const past = questsForDate(d('2026-10-21'), today, tasks, [], [], null);
    expect(past.active).toHaveLength(1);
    if (past.active[0]?.kind === 'task') expect(past.active[0].overdue).toBe(false);
  });

  it('puts completed tasks on their completion day', () => {
    const tasks = [
      task({ id: 't1', title: 'Done', status: 'done', completedLocalDate: d('2026-10-21') }),
    ];
    const view = questsForDate(d('2026-10-21'), today, tasks, [], [], null);
    expect(view.completed).toHaveLength(1);
  });

  it('promotes the priority mission to the front', () => {
    const tasks = [
      task({ id: 'a', title: 'A', priority: 2 }),
      task({ id: 'b', title: 'B', priority: 0 }),
    ];
    const view = questsForDate(today, today, tasks, [], [], { kind: 'task', id: 'b' });
    expect(view.mission?.kind).toBe('task');
    expect(view.active[0]?.kind).toBe('task');
    if (view.active[0]?.kind === 'task') expect(view.active[0].task.id).toBe('b');
  });
});

describe('sanitizePriorityMission', () => {
  it('clears invalid missions', () => {
    const tasks = [task({ id: 't1', title: 'T', status: 'done' })];
    expect(sanitizePriorityMission({ kind: 'task', id: 't1' }, tasks, [])).toBeNull();
  });
});
