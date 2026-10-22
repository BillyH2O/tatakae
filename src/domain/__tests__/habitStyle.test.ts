import { PRODUCT } from '../../config/product';
import { normalizeHabitTitle, resolveHabitStyle } from '../habitStyle';

describe('resolveHabitStyle', () => {
  it('keeps a color and icon that are offered', () => {
    const color = PRODUCT.habits.colorPalette[3];
    const icon = PRODUCT.habits.iconChoices[2];
    expect(resolveHabitStyle({ color, icon })).toEqual({ color, icon });
  });

  it('falls back to the default look for missing or unknown values', () => {
    const fallback = { color: PRODUCT.habits.defaultColor, icon: PRODUCT.habits.defaultIcon };
    expect(resolveHabitStyle({})).toEqual(fallback);
    expect(resolveHabitStyle({ color: '#123456', icon: 'not-an-icon' })).toEqual(fallback);
    expect(resolveHabitStyle({ color: null, icon: null })).toEqual(fallback);
  });

  it('only offers distinct colors and icons, defaults included', () => {
    expect(new Set(PRODUCT.habits.colorPalette).size).toBe(PRODUCT.habits.colorPalette.length);
    expect(new Set(PRODUCT.habits.iconChoices).size).toBe(PRODUCT.habits.iconChoices.length);
    expect(PRODUCT.habits.colorPalette).toContain(PRODUCT.habits.defaultColor);
    expect(PRODUCT.habits.iconChoices).toContain(PRODUCT.habits.defaultIcon);
  });
});

describe('normalizeHabitTitle', () => {
  it('trims, and rejects empty or too long names', () => {
    expect(normalizeHabitTitle('  Read  ')).toBe('Read');
    expect(normalizeHabitTitle('   ')).toBeNull();
    expect(normalizeHabitTitle('x'.repeat(PRODUCT.habits.maxTitleLength + 1))).toBeNull();
    expect(normalizeHabitTitle('x'.repeat(PRODUCT.habits.maxTitleLength))).not.toBeNull();
  });
});
