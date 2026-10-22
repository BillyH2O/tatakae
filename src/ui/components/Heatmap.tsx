import { StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import type { HeatmapCell } from '../../domain/stats';
import { en } from '../../i18n/en';
import { border, colors, radius, space, type } from '../theme/tokens';

const WEEKDAY_ROWS = ['M', '', 'W', '', 'F', '', ''] as const;

function fillOf(cell: HeatmapCell): string {
  if (cell.bucket) return colors.score[cell.bucket];
  if (cell.state.kind === 'rest' || cell.state.kind === 'noGoal') return colors.divider;
  return 'transparent';
}

/**
 * Regularity grid: one column per week (Monday on top), same day states and colors as the Home
 * calendar. The grid is announced once as a summary; the legend gives every color a text.
 */
export function Heatmap({ grid }: { grid: readonly (readonly HeatmapCell[])[] }) {
  const cells = grid.flat();
  const scored = cells.filter((cell) => cell.bucket !== null);
  const reached = scored.filter((cell) => cell.bucket === 'full').length;
  const { low, mid, good } = PRODUCT.score.buckets;
  const legend = [
    { color: colors.score.low, label: en.stats.heatmap.low(low) },
    { color: colors.score.mid, label: en.stats.heatmap.mid(low, mid) },
    { color: colors.score.good, label: en.stats.heatmap.good(mid, good) },
    { color: colors.score.full, label: en.stats.heatmap.full },
    { color: colors.divider, label: en.stats.heatmap.rest },
  ];

  return (
    <View style={styles.root}>
      <View
        style={styles.grid}
        accessible
        accessibilityLabel={en.stats.heatmap.a11y(grid.length, scored.length, reached)}
      >
        <View style={styles.weekdays}>
          {WEEKDAY_ROWS.map((label, index) => (
            <Text key={index} style={styles.weekday} maxFontSizeMultiplier={1.1}>
              {label}
            </Text>
          ))}
        </View>
        {grid.map((week, weekIndex) => (
          <View key={week[0]?.date ?? weekIndex} style={styles.week}>
            {week.map((cell) => (
              <View
                key={cell.date}
                style={[
                  styles.cell,
                  { backgroundColor: fillOf(cell) },
                  cell.state.kind === 'future' && styles.cellFuture,
                  cell.state.kind === 'today' && styles.cellToday,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {legend.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  grid: { flexDirection: 'row', gap: 3 },
  weekdays: { gap: 3, width: 12 },
  weekday: { flex: 1, ...type.caption, fontSize: 9, lineHeight: 12, color: colors.textFaint },
  week: { flex: 1, gap: 3 },
  cell: { aspectRatio: 1, borderRadius: 2 },
  cellFuture: { borderWidth: border.hairline, borderColor: colors.divider },
  cellToday: { borderWidth: 1, borderColor: colors.actionBright },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: space.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  swatch: { width: 10, height: 10, borderRadius: radius.sm },
  legendText: { ...type.caption, color: colors.textMuted },
});
