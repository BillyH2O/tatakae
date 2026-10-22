import { levelFromXp, levelThreshold, xpForFocusedSec } from '../xp';

describe('xpForFocusedSec (1 XP per full minute)', () => {
  it.each([
    [0, 0],
    [59, 0],
    [60, 1],
    [119, 1],
    [25 * 60, 25],
    [760, 12], // stopped at 12 min 40 s
  ])('%i s → %i XP', (sec, xp) => {
    expect(xpForFocusedSec(sec)).toBe(xp);
  });

  it('never goes negative', () => {
    expect(xpForFocusedSec(-30)).toBe(0);
  });

  it('is configurable (rule is a product assumption)', () => {
    expect(xpForFocusedSec(300, { perFullMinute: 2, levelStepXp: 60 })).toBe(10);
  });
});

describe('levelThreshold', () => {
  it.each([
    [1, 0],
    [2, 60],
    [3, 180],
    [10, 2700],
  ])('level %i needs %i XP', (level, xp) => {
    expect(levelThreshold(level)).toBe(xp);
  });
});

describe('levelFromXp', () => {
  it('handles the boundaries', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNext: 60, progress: 0 });
    expect(levelFromXp(59).level).toBe(1);
    expect(levelFromXp(60)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNext: 120 });
    expect(levelFromXp(179).level).toBe(2);
    expect(levelFromXp(180).level).toBe(3);
    expect(levelFromXp(2699).level).toBe(9);
    expect(levelFromXp(2700).level).toBe(10);
  });

  it('reports progress inside the level', () => {
    const result = levelFromXp(120);
    expect(result.level).toBe(2);
    expect(result.xpIntoLevel).toBe(60);
    expect(result.progress).toBeCloseTo(0.5);
  });

  it('clamps negative XP to level 1', () => {
    expect(levelFromXp(-50).level).toBe(1);
  });

  it('is consistent with thresholds for a wide XP range', () => {
    for (let xp = 0; xp < 20_000; xp += 37) {
      const { level } = levelFromXp(xp);
      expect(levelThreshold(level)).toBeLessThanOrEqual(xp);
      expect(levelThreshold(level + 1)).toBeGreaterThan(xp);
    }
  });
});
