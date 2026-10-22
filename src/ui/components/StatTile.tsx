import { StyleSheet, Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { colors, space, type } from '../theme/tokens';

interface Props {
  label: string;
  value: string;
}

/** One KPI of the Stats screen: big value, small label. Items are separated by dividers, not panels. */
export function StatTile({ label, value }: Props) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={en.stats.tiles.a11y(label, value)}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: 2, alignItems: 'center', paddingHorizontal: space.xs },
  value: { ...type.h2, color: colors.text, fontVariant: ['tabular-nums'] },
  label: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});
