import { Pressable, StyleSheet, Text, View } from 'react-native';

import { border, colors, glowStrong, radius, touch, type } from '../theme/tokens';

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

/** One outlined track; the selected segment is a raised, glowing pill inside it. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
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
  track: {
    flexDirection: 'row',
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: 'rgba(10,18,36,0.6)',
    borderRadius: radius.md,
  },
  segment: {
    flex: 1,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touch.min,
    borderWidth: border.thin,
    borderColor: 'transparent',
    borderRadius: radius.md,
    margin: -border.thin,
  },
  segmentSelected: {
    backgroundColor: 'rgba(47,123,255,0.28)',
    borderColor: colors.borderStrong,
    boxShadow: glowStrong,
  },
  label: { ...type.body, color: colors.textMuted },
  labelSelected: { color: colors.text, fontWeight: '600' },
});
