import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RadarAxisId, RadarAxisResult } from '../../domain/radar';
import { en } from '../../i18n/en';
import { colors, radius, space, touch, type } from '../theme/tokens';
import { radarAxisA11y, radarSampleText, radarStopsText, radarValueText } from './radarText';

interface Props {
  axes: readonly RadarAxisResult[];
  selected: RadarAxisId | null;
  onSelect: (axis: RadarAxisId | null) => void;
}

/**
 * Text list of the four axes: exact value, what it is based on, and the calculation of the
 * selected axis. Always rendered, so the radar is readable without seeing the chart.
 */
export function RadarLegend({ axes, selected, onSelect }: Props) {
  return (
    <View style={styles.list}>
      {axes.map((axis) => {
        const isSelected = selected === axis.axis;
        const stops = radarStopsText(axis);
        return (
          <View key={axis.axis}>
            <Pressable
              onPress={() => onSelect(isSelected ? null : axis.axis)}
              style={[styles.row, isSelected && styles.rowSelected]}
              accessibilityRole="button"
              accessibilityLabel={radarAxisA11y(axis)}
              accessibilityState={{ expanded: isSelected }}
            >
              <View style={styles.main}>
                <Text style={styles.name} numberOfLines={1}>
                  {en.home.form.axes[axis.axis]}
                </Text>
                <Text style={styles.sample}>{radarSampleText(axis)}</Text>
              </View>
              <Text style={[styles.value, axis.value === null && styles.valueMissing]}>{radarValueText(axis)}</Text>
            </Pressable>
            {isSelected ? (
              <View style={styles.explain}>
                <Text style={styles.explainText}>
                  {axis.value === null ? en.home.form.insufficient : `${axis.value.toFixed(1)} / 100`}
                </Text>
                <Text style={styles.explainText}>{en.home.form.explain[axis.axis]}</Text>
                {stops ? <Text style={styles.explainText}>{stops}</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min,
    paddingHorizontal: space.xs,
    borderRadius: radius.sm,
  },
  rowSelected: { backgroundColor: colors.actionMuted },
  main: { flex: 1 },
  name: { ...type.label, color: colors.text },
  sample: { ...type.caption, color: colors.textMuted },
  value: { ...type.h2, color: colors.actionBright, minWidth: 32, textAlign: 'right', fontVariant: ['tabular-nums'] },
  valueMissing: { color: colors.textFaint },
  explain: { gap: space.xs, paddingHorizontal: space.xs, paddingBottom: space.sm },
  explainText: { ...type.caption, color: colors.textMuted },
});
