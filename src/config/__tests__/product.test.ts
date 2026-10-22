import { PRODUCT } from '../product';

describe('PRODUCT assumptions', () => {
  it('encodes the provisional rules of the spec', () => {
    expect(PRODUCT.xp.perFullMinute).toBe(1);
    expect(PRODUCT.xp.questCompletionBonus).toBe(0);
    expect(PRODUCT.timer.defaultFocusMin).toBe(25);
    expect(PRODUCT.timer.defaultBreakMin).toBe(5);
    expect(PRODUCT.radar.windowDays).toBe(14);
    expect(PRODUCT.radar.forceMinRatings).toBe(3);
  });

  it('defines no crystal earning rule and no shop', () => {
    expect(PRODUCT.crystals.initialBalance).toBe(0);
    expect(PRODUCT.crystals.earningRules).toHaveLength(0);
    expect(PRODUCT.crystals.shopEnabled).toBe(false);
  });

  it('has ordered score buckets covering 0..100', () => {
    const { low, mid, good } = PRODUCT.score.buckets;
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(good);
    expect(good).toBe(100);
  });
});
