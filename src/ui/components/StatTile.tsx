import { StyleSheet, Text, View } from 'react-native';

import { en } from '../../i18n/en';
import { border, colors, radius, space, type } from '../theme/tokens';

interface Props {
  label: string;
  value: string;
}

/** One KPI: a big cyan figure over a small label, in its own quiet cell. */
export function StatTile({ label, value }: Props) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={en.stats.tiles.a11y(label, value)}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.3}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
    borderRadius: radius.md,
  },
  value: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.cyan, fontVariant: ['tabular-nums'] },
  label: { ...type.caption, color: colors.textMuted },
});
