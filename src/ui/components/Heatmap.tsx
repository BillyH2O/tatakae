import { StyleSheet, Text, View } from 'react-native';

import type { ScoreBucket } from '../../domain/scores';
import type { HeatmapCell } from '../../domain/stats';
import { en } from '../../i18n/en';
import { border, colors, space, type } from '../theme/tokens';

const WEEKDAY_ROWS = ['M', '', 'W', '', 'F', '', ''] as const;

/** One blue, four intensities (score bucket); the exact day scores live on the Home calendar. */
const RAMP: Record<ScoreBucket, string> = {
  low: 'rgba(47,140,255,0.28)',
  mid: 'rgba(47,140,255,0.5)',
  good: 'rgba(47,140,255,0.78)',
  full: colors.cyan,
};
const RAMP_ORDER: readonly ScoreBucket[] = ['low', 'mid', 'good', 'full'];

function fillOf(cell: HeatmapCell): string {
  if (cell.bucket) return RAMP[cell.bucket];
  if (cell.state.kind === 'rest' || cell.state.kind === 'noGoal') return colors.divider;
  return 'transparent';
}

/**
 * Regularity grid: one column per week (Monday on top), brighter = closer to the daily goal.
 * Announced once as a summary for screen readers; the legend reads "Less … More".
 */
export function Heatmap({ grid }: { grid: readonly (readonly HeatmapCell[])[] }) {
  const cells = grid.flat();
  const scored = cells.filter((cell) => cell.bucket !== null);
  const reached = scored.filter((cell) => cell.bucket === 'full').length;

  return (
    <View style={styles.root}>
      <View style={styles.grid} accessible accessibilityLabel={en.stats.heatmap.a11y(grid.length, scored.length, reached)}>
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
        <Text style={styles.legendText}>{en.stats.heatmap.less}</Text>
        {RAMP_ORDER.map((bucket) => (
          <View key={bucket} style={[styles.swatch, { backgroundColor: RAMP[bucket] }]} />
        ))}
        <Text style={styles.legendText}>{en.stats.heatmap.more}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  grid: { flexDirection: 'row', gap: 3 },
  weekdays: { gap: 3, width: 12 },
  weekday: { flex: 1, ...type.caption, fontSize: 9, lineHeight: 12, color: colors.textFaint },
  week: { flex: 1, gap: 3 },
  cell: { aspectRatio: 1, borderRadius: 3 },
  cellFuture: { borderWidth: border.hairline, borderColor: colors.divider },
  cellToday: { borderWidth: 1, borderColor: colors.text },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { ...type.caption, fontSize: 11, color: colors.textMuted },
});
