import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import type { CategoryBar } from '../../domain/totals';
import { en, formatDuration } from '../../i18n/en';
import { colors, radius, space, touch, type } from '../theme/tokens';

const UNCATEGORIZED_ICON = 'shape-outline';

function nameOf(bar: CategoryBar): string {
  if (!bar.category) return en.home.categories.uncategorized;
  return bar.category.archivedAt === null
    ? bar.category.name
    : `${bar.category.name} (${en.home.categories.archived})`;
}

/** Horizontal bars on a common scale (the biggest category of the day is full), icon + name + duration. */
export function CategoryBars({ bars }: { bars: readonly CategoryBar[] }) {
  return (
    <View style={styles.list}>
      {bars.map((bar) => {
        const color = bar.category?.color ?? colors.score.neutral;
        const duration = formatDuration(bar.focusedSec);
        return (
          <View
            key={bar.category?.id ?? 'uncategorized'}
            style={styles.row}
            accessible
            accessibilityLabel={en.home.categories.rowA11y(nameOf(bar), duration)}
          >
            <MaterialCommunityIcons
              name={(bar.category?.icon ?? UNCATEGORIZED_ICON) as keyof typeof MaterialCommunityIcons.glyphMap}
              size={20}
              color={color}
            />
            <View style={styles.main}>
              <View style={styles.line}>
                <Text style={styles.name} numberOfLines={1}>
                  {nameOf(bar)}
                </Text>
                <Text style={styles.duration}>{duration}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(2, bar.ratio * 100)}%`, backgroundColor: color }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: touch.min - space.sm },
  main: { flex: 1, gap: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  name: { ...type.label, color: colors.text, flexShrink: 1 },
  duration: { ...type.caption, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: radius.sm, backgroundColor: colors.actionMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.sm },
});
