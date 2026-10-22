import { dayCellState, dayScore, scoreBucket, scoreDisplay } from '../scores';
import type { LocalDate } from '../types';

const d = (value: string) => value as LocalDate;
const TODAY = d('2026-10-22');

describe('dayScore', () => {
  it('is minutes over goal, capped at 100, never rounded', () => {
    expect(dayScore(60 * 60, 120)).toBe(50);
    expect(dayScore(2 * 60 * 60, 120)).toBe(100);
    expect(dayScore(5 * 60 * 60, 120)).toBe(100);
    expect(dayScore(0, 120)).toBe(0);
    expect(dayScore(7170, 120)).toBeCloseTo(99.583, 3);
  });

  it('is 0 for a non-positive goal instead of dividing by zero', () => {
    expect(dayScore(600, 0)).toBe(0);
  });
});

describe('scoreBucket', () => {
  it('uses the raw value at the thresholds', () => {
    expect(scoreBucket(0)).toBe('low');
    expect(scoreBucket(39.99)).toBe('low');
    expect(scoreBucket(40)).toBe('mid');
    expect(scoreBucket(79.99)).toBe('mid');
    expect(scoreBucket(80)).toBe('good');
    expect(scoreBucket(99.99)).toBe('good');
    expect(scoreBucket(100)).toBe('full');
  });
});

describe('scoreDisplay', () => {
  it('floors, so 99.6 reads 99 and nothing exceeds 100', () => {
    expect(scoreDisplay(99.6)).toBe(99);
    expect(scoreDisplay(100)).toBe(100);
    expect(scoreDisplay(137)).toBe(100);
    expect(scoreDisplay(0.9)).toBe(0);
    expect(scoreDisplay(-3)).toBe(0);
  });
});

describe('dayCellState', () => {
  const goal = { kind: 'goal', minutes: 120 } as const;

  it('future day with a goal: no score', () => {
    expect(dayCellState(d('2026-10-23'), TODAY, goal, 0)).toEqual({ kind: 'future' });
  });

  it('today is in progress and carries the live score', () => {
    expect(dayCellState(TODAY, TODAY, goal, 88 * 60)).toEqual({ kind: 'today', score: (88 / 120) * 100 });
  });

  it('a past day without any session is a real 0', () => {
    expect(dayCellState(d('2026-10-21'), TODAY, goal, 0)).toEqual({ kind: 'past', score: 0 });
  });

  it('a past day reached its goal: 100', () => {
    expect(dayCellState(d('2026-10-21'), TODAY, goal, 7200)).toEqual({ kind: 'past', score: 100 });
  });

  it('planned rest is neutral and a missing goal has no score, past or future', () => {
    expect(dayCellState(d('2026-10-18'), TODAY, { kind: 'rest' }, 0)).toEqual({ kind: 'rest' });
    expect(dayCellState(d('2026-10-25'), TODAY, { kind: 'rest' }, 0)).toEqual({ kind: 'rest' });
    expect(dayCellState(d('2026-10-21'), TODAY, { kind: 'none' }, 3600)).toEqual({ kind: 'noGoal' });
    expect(dayCellState(d('2026-10-24'), TODAY, { kind: 'none' }, 0)).toEqual({ kind: 'noGoal' });
  });

  it('the day boundary: yesterday is past, today is in progress, tomorrow is future', () => {
    expect(dayCellState(d('2026-10-21'), TODAY, goal, 0).kind).toBe('past');
    expect(dayCellState(TODAY, TODAY, goal, 0).kind).toBe('today');
    expect(dayCellState(d('2026-10-23'), TODAY, goal, 0).kind).toBe('future');
  });
});
