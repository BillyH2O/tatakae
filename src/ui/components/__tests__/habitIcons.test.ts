import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { PRODUCT } from '../../../config/product';

describe('habit icon choices', () => {
  it('only offers icons that exist in the MaterialCommunityIcons font', () => {
    const glyphs = MaterialCommunityIcons.glyphMap as Record<string, number>;
    const missing = PRODUCT.habits.iconChoices.filter((name) => !(name in glyphs));
    expect(missing).toEqual([]);
  });
});
