import { PRODUCT } from '../../config/product';
import { planCorrection, planManualEntry, xpDelta } from '../sessionEdit';
import { asLocalDate as d } from '../time/localDate';

const NOW = new Date(2026, 9, 22, 15, 0, 0).getTime();
const entry = (over: Partial<Parameters<typeof planManualEntry>[0]> = {}) => ({
  date: d('2026-10-22'),
  time: '09:30',
  durationMin: 45,
  ...over,
});

describe('planManualEntry', () => {
  it('builds one contiguous interval with its day segments', () => {
    const plan = planManualEntry(entry(), NOW);
    expect(plan).toMatchObject({
      ok: true,
      startedAt: new Date(2026, 9, 22, 9, 30).getTime(),
      endedAt: new Date(2026, 9, 22, 10, 15).getTime(),
      focusedSec: 45 * 60,
      segments: [{ localDate: '2026-10-22', focusedSec: 2700 }],
    });
  });

  it('splits an entry across midnight', () => {
    const plan = planManualEntry(entry({ date: d('2026-10-20'), time: '23:30', durationMin: 60 }), NOW);
    expect(plan.ok && plan.segments).toEqual([
      { localDate: '2026-10-20', focusedSec: 1800 },
      { localDate: '2026-10-21', focusedSec: 1800 },
    ]);
  });

  it('rejects an invalid time, a too short or too long duration and the future', () => {
    expect(planManualEntry(entry({ time: '25:00' }), NOW)).toEqual({ ok: false, error: 'invalid_time' });
    expect(planManualEntry(entry({ time: '9h30' }), NOW)).toEqual({ ok: false, error: 'invalid_time' });
    expect(planManualEntry(entry({ durationMin: 0 }), NOW)).toEqual({ ok: false, error: 'too_short' });
    expect(planManualEntry(entry({ durationMin: PRODUCT.stats.manualMaxMin + 1 }), NOW)).toEqual({ ok: false, error: 'too_long' });
    expect(planManualEntry(entry({ durationMin: Number.NaN }), NOW)).toEqual({ ok: false, error: 'not_a_number' });
    expect(planManualEntry(entry({ date: d('2026-10-23') }), NOW)).toEqual({ ok: false, error: 'in_future' });
    expect(planManualEntry(entry({ time: '14:30', durationMin: 45 }), NOW)).toEqual({ ok: false, error: 'in_future' });
  });

  it('accepts an entry that ends exactly now', () => {
    expect(planManualEntry(entry({ time: '14:15', durationMin: 45 }), NOW).ok).toBe(true);
  });
});

describe('planCorrection', () => {
  const started = new Date(2026, 9, 22, 9, 0).getTime();

  it('recomputes the end and the segments from the original start', () => {
    expect(planCorrection(started, 20 * 60, NOW)).toEqual({
      ok: true,
      endedAt: started + 20 * 60_000,
      focusedSec: 1200,
      segments: [{ localDate: '2026-10-22', focusedSec: 1200 }],
    });
  });

  it('refuses invalid or future results', () => {
    expect(planCorrection(started, 30, NOW)).toEqual({ ok: false, error: 'too_short' });
    expect(planCorrection(started, 13 * 3600, NOW)).toEqual({ ok: false, error: 'too_long' });
    expect(planCorrection(started, 7 * 3600, NOW)).toEqual({ ok: false, error: 'in_future' });
  });
});

describe('xpDelta', () => {
  it('25 → 20 min removes 5 XP; 25 → 30 adds 5; no change adds nothing', () => {
    expect(xpDelta(25, 20 * 60)).toBe(-5);
    expect(xpDelta(25, 30 * 60)).toBe(5);
    expect(xpDelta(25, 25 * 60)).toBe(0);
  });

  it('keeps the invariant after several corrections', () => {
    let earned = 25;
    for (const minutes of [20, 40, 33]) earned += xpDelta(earned, minutes * 60);
    expect(earned).toBe(33);
  });
});
