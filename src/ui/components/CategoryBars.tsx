import { StyleSheet, Text, View } from 'react-native';

import type { CategoryBar } from '../../domain/totals';
import { en, formatDuration } from '../../i18n/en';
import { colors, space, type } from '../theme/tokens';

function nameOf(bar: CategoryBar): string {
  if (!bar.category) return en.home.categories.uncategorized;
  return bar.category.archivedAt === null
    ? bar.category.name
    : `${bar.category.name} (${en.home.categories.archived})`;
}

/** Name and duration on one line, one blue bar below on a common scale (the biggest category is full). */
export function CategoryBars({ bars }: { bars: readonly CategoryBar[] }) {
  return (
    <View style={styles.list}>
      {bars.map((bar) => {
        const duration = formatDuration(bar.focusedSec);
        return (
          <View
            key={bar.category?.id ?? 'uncategorized'}
            style={styles.row}
            accessible
            accessibilityLabel={en.home.categories.rowA11y(nameOf(bar), duration)}
          >
            <View style={styles.line}>
              <Text style={styles.name} numberOfLines={1}>
                {nameOf(bar)}
              </Text>
              <Text style={styles.duration}>{duration}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(3, bar.ratio * 100)}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  row: { gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  name: { ...type.label, color: colors.text, flexShrink: 1 },
  duration: { ...type.label, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(47,123,255,0.22)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.bar },
});
