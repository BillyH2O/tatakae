import { Pressable, StyleSheet, Text, View } from 'react-native';

import { border, colors, radius, space, type } from '../theme/tokens';

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
  row: {
    flexDirection: 'row',
    borderWidth: border.hairline,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  segmentSelected: {
    backgroundColor: colors.actionMuted,
    borderBottomWidth: 2,
    borderBottomColor: colors.actionBright,
  },
  label: { ...type.caption, color: colors.textMuted, fontWeight: '500' },
  labelSelected: { color: colors.actionBright },
});
