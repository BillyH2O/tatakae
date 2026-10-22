import { Pressable, StyleSheet, Text, View } from 'react-native';

import { border, colors, glow, radius, space, touch, type } from '../theme/tokens';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View style={styles.row} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
            accessibilityRole="tab"
            aria-selected={selected}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  segment: {
    flex: 1,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touch.min,
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
    borderRadius: radius.md,
  },
  segmentSelected: {
    backgroundColor: colors.actionMuted,
    borderColor: colors.borderStrong,
    boxShadow: glow,
  },
  label: { ...type.label, color: colors.textMuted },
  labelSelected: { color: colors.text, fontWeight: '700' },
});
