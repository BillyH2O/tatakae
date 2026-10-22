import type { RadarAxisResult } from '../../../domain/radar';
import { en, formatDayLong, formatDayShort, formatWeekRange } from '../../../i18n/en';
import { stackedLayout } from '../../../hooks/useResponsiveLayout';
import { dayCellStateText } from '../DayCell';
import { radarVertices } from '../RadarChart';
import { radarAxisA11y, radarSampleText, radarStopsText, radarValueText } from '../radarText';

const axis = (partial: Partial<RadarAxisResult> & Pick<RadarAxisResult, 'axis' | 'detail'>): RadarAxisResult => ({
  value: null,
  status: 'insufficient',
  inProgress: false,
  ...partial,
});

const strengthMissing = axis({ axis: 'strength', detail: { axis: 'strength', rated: 2, required: 3 } });
const enduranceOk = axis({
  axis: 'endurance',
  value: 62.4,
  status: 'ok',
  inProgress: true,
  detail: { axis: 'endurance', focusMin: 300, goalMin: 480, goalDays: 4 },
});
const mentalOk = axis({
  axis: 'mental',
  value: 50,
  status: 'ok',
  detail: { axis: 'mental', completed: 2, stopped: 2, stopReasons: { interrupted: 1, tired: 1 } },
});
const consistencyOk = axis({
  axis: 'consistency',
  value: 99.6,
  status: 'ok',
  detail: { axis: 'consistency', achieved: 5, planned: 5 },
});

describe('dayCellStateText (the color is never the only signal)', () => {
  it('says each state in words, flooring the score', () => {
    expect(dayCellStateText({ kind: 'today', score: 88.4 })).toBe('88 percent, in progress');
    expect(dayCellStateText({ kind: 'past', score: 99.6 })).toBe('99 percent');
    expect(dayCellStateText({ kind: 'past', score: 0 })).toBe('0 percent');
    expect(dayCellStateText({ kind: 'future' })).toBe('no score yet');
    expect(dayCellStateText({ kind: 'rest' })).toBe('planned rest day');
    expect(dayCellStateText({ kind: 'noGoal' })).toBe('no goal set');
  });
});

describe('radar text', () => {
  it('an axis without data reads "—" and is described as missing data, never 0', () => {
    expect(radarValueText(strengthMissing)).toBe('—');
    expect(radarSampleText(strengthMissing)).toBe('2/3 rated sessions');
    expect(radarAxisA11y(strengthMissing)).toContain('not enough data');
  });

  it('floors the value (99.6 → 99) and flags today in progress', () => {
    expect(radarValueText(consistencyOk)).toBe('99');
    expect(radarValueText(enduranceOk)).toBe('62');
    expect(radarSampleText(enduranceOk)).toBe('300 of 480 min planned · today in progress');
  });

  it('keeps the stop reasons, neutrally', () => {
    expect(radarSampleText(mentalOk)).toBe('2 of 4 countdowns completed');
    expect(radarStopsText(mentalOk)).toBe('2 early stops: Interrupted ×1, Tired ×1');
    expect(radarStopsText(enduranceOk)).toBeNull();
  });
});

describe('radarVertices', () => {
  it('draws no vertex for an axis without data', () => {
    const vertices = radarVertices([strengthMissing, enduranceOk, mentalOk, consistencyOk]);
    expect(vertices.map((vertex) => vertex.axis)).toEqual(['endurance', 'mental', 'consistency']);
  });

  it('places a value of 0 at the center and 100 on the rim, in the fixed axis directions', () => {
    const zero = radarVertices([axis({ axis: 'endurance', value: 0, status: 'ok', detail: enduranceOk.detail })]);
    const full = radarVertices([axis({ axis: 'endurance', value: 100, status: 'ok', detail: enduranceOk.detail })]);
    expect(zero[0]).toMatchObject({ x: 100, y: 100 });
    expect(full[0]?.x).toBeGreaterThan(100);
    expect(full[0]?.y).toBeCloseTo(100);
    const top = radarVertices([axis({ axis: 'strength', value: 100, status: 'ok', detail: strengthMissing.detail })]);
    expect(top[0]?.y).toBeLessThan(100);
  });

  it('never goes past the rim', () => {
    const over = radarVertices([axis({ axis: 'mental', value: 250, status: 'ok', detail: mentalOk.detail })]);
    const rim = radarVertices([axis({ axis: 'mental', value: 100, status: 'ok', detail: mentalOk.detail })]);
    expect(over[0]).toEqual(rim[0]);
  });
});

describe('stackedLayout', () => {
  it('stacks the blocks on narrow screens or with large text', () => {
    expect(stackedLayout(360, 1)).toBe(true);
    expect(stackedLayout(480, 1)).toBe(false);
    expect(stackedLayout(419, 1)).toBe(true);
    expect(stackedLayout(420, 1)).toBe(false);
    expect(stackedLayout(480, 1.3)).toBe(true);
    expect(stackedLayout(480, 1.2)).toBe(false);
  });
});

describe('date labels', () => {
  it('formats the week range within a month, across months and across years', () => {
    expect(formatWeekRange('2026-10-19', '2026-10-25')).toBe('19 – 25 Oct 2026');
    expect(formatWeekRange('2026-10-26', '2026-11-01')).toBe('26 Oct – 1 Nov 2026');
    expect(formatWeekRange('2026-12-28', '2027-01-03')).toBe('28 Dec 2026 – 3 Jan 2027');
  });

  it('names the day', () => {
    expect(formatDayLong('2026-10-22')).toBe('Thursday 22 October');
    expect(formatDayShort('2026-10-25')).toBe('Sun 25 Oct');
    expect(en.home.calendar.rest).toBe('Rest');
  });
});
