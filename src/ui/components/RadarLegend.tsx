import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RadarAxisId, RadarAxisResult } from '../../domain/radar';
import { en } from '../../i18n/en';
import { border, colors, radius, space, type } from '../theme/tokens';
import { radarAxisA11y, radarSampleText, radarStopsText, radarValueText } from './radarText';

interface Props {
  axes: readonly RadarAxisResult[];
  selected: RadarAxisId | null;
  onSelect: (axis: RadarAxisId | null) => void;
  /** Large text: one full row per axis, with what it is based on. */
  detailed?: boolean;
}

/** Name and value of each axis next to the radar; tapping one toggles its explanation. */
export function RadarLegend({ axes, selected, onSelect, detailed }: Props) {
  return (
    <View style={styles.list}>
      {axes.map((axis) => {
        const isSelected = selected === axis.axis;
        return (
          <Pressable
            key={axis.axis}
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
              {detailed ? <Text style={styles.sample}>{radarSampleText(axis)}</Text> : null}
            </View>
            <Text style={[styles.value, axis.value === null && styles.valueMissing]}>{radarValueText(axis)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Explanation of the selected axis: what the figure is based on and how it is computed. */
export function RadarExplanation({ axis }: { axis: RadarAxisResult }) {
  const stops = radarStopsText(axis);
  return (
    <View style={styles.explain} accessibilityLiveRegion="polite">
      <Text style={styles.explainTitle}>
        {en.home.form.axes[axis.axis]} · {axis.value === null ? en.home.form.insufficient : `${axis.value.toFixed(1)} / 100`}
      </Text>
      <Text style={styles.explainText}>{radarSampleText(axis)}</Text>
      <Text style={styles.explainText}>{en.home.form.explain[axis.axis]}</Text>
      {stops ? <Text style={styles.explainText}>{stops}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 34,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  rowSelected: { backgroundColor: 'rgba(47,123,255,0.18)' },
  main: { flex: 1, minWidth: 0 },
  name: { ...type.label, color: colors.textMuted },
  sample: { ...type.caption, color: colors.textMuted },
  value: { ...type.h2, fontWeight: '700', color: colors.cyan, minWidth: 32, textAlign: 'right', fontVariant: ['tabular-nums'] },
  valueMissing: { color: colors.textFaint },
  explain: {
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
  },
  explainTitle: { ...type.label, color: colors.text },
  explainText: { ...type.caption, color: colors.textMuted },
});
