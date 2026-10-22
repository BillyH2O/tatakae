import { blend, contrastRatio, parseHex } from '../contrast';
import { colors, panelAlpha, veil, veilForPath } from '../tokens';

const PANEL = parseHex('#0A1224');
// Worst case behind a translucent panel: a pure white patch of the landscape.
const WHITE = { r: 255, g: 255, b: 255 };

describe('theme contrast', () => {
  it.each([
    ['text', colors.text],
    ['textMuted', colors.textMuted],
  ])('%s on a 0.90 panel over white stays ≥ 4.5:1', (_name, color) => {
    const background = blend(PANEL, panelAlpha.home, WHITE);
    expect(contrastRatio(parseHex(color), background)).toBeGreaterThanOrEqual(4.5);
  });

  it('computes known WCAG ratios', () => {
    expect(contrastRatio(WHITE, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, WHITE)).toBe(1);
  });
});

describe('veilForPath', () => {
  it('darkens the landscape per screen', () => {
    expect(veilForPath('/')).toBe(veil.home);
    expect(veilForPath('/quests')).toBe(veil.quests);
    expect(veilForPath('/stats')).toBe(veil.stats);
    expect(veilForPath('/profile')).toBe(veil.profile);
    expect(veilForPath('/focus')).toBe(veil.focus);
    expect(veilForPath('/elsewhere')).toBe(veil.fallback);
  });
});
