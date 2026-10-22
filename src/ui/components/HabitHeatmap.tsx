import { StyleSheet, Text, View } from 'react-native';

import type { HabitHeatCell, HabitHeatState } from '../../domain/habits';
import type { LocalDate } from '../../domain/types';
import { en } from '../../i18n/en';
import { border, colors, space, type } from '../theme/tokens';

const WEEKDAY_ROWS = ['M', '', 'W', '', 'F', '', ''] as const;
const MISSED = 'rgba(160,180,220,0.22)';

interface Props {
  grid: readonly (readonly HabitHeatCell[])[];
  /** The habit's own color: a done day is filled with it. */
  color: string;
  today: LocalDate;
  /** Spoken once for screen readers instead of 126 separate cells. */
  accessibilityLabel: string;
  legend?: boolean;
}

function fillOf(state: HabitHeatState, color: string): string {
  switch (state) {
    case 'done':
      return color;
    case 'missed':
      return MISSED;
    case 'rest':
      return colors.divider;
    case 'absent':
      // Before the habit existed: only a ghost of the cell, so the grid keeps its full shape.
      return 'rgba(160,180,220,0.04)';
    default:
      return 'transparent';
  }
}

/**
 * GitHub-style regularity grid of one habit: a column per week (Monday on top), a filled cell for
 * every day done, a dim one for every day missed, a faint one for days off the habit's schedule.
 */
export function HabitHeatmap({ grid, color, today, accessibilityLabel, legend = true }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.grid} accessible accessibilityLabel={accessibilityLabel}>
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
                  { backgroundColor: fillOf(cell.state, color) },
                  cell.state === 'upcoming' && styles.cellUpcoming,
                  cell.state === 'pending' && { borderWidth: 1, borderColor: color },
                  cell.date === today && cell.state === 'done' && styles.cellToday,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      {legend ? (
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: MISSED }]} />
          <Text style={styles.legendText}>{en.stats.habits.missed}</Text>
          <View style={[styles.swatch, { backgroundColor: color }]} />
          <Text style={styles.legendText}>{en.stats.habits.done}</Text>
        </View>
      ) : null}
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
  cellUpcoming: { borderWidth: border.hairline, borderColor: colors.divider },
  cellToday: { borderWidth: 1, borderColor: colors.text },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { ...type.caption, fontSize: 11, color: colors.textMuted, marginRight: space.sm },
});