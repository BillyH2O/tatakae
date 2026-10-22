import { Pressable, StyleSheet, Text } from 'react-native';

import { border, colors, radius, space, touch, type } from '../theme/tokens';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Optional accent (category color) shown as a left bar when selected. */
  accent?: string;
}

export function Chip({ label, selected, onPress, accent }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.selected,
        selected && accent ? { borderColor: accent } : null,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch.min,
    paddingHorizontal: space.md,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: border.thin,
    borderColor: colors.border,
  },
  selected: { backgroundColor: colors.actionMuted, borderColor: colors.actionBright },
  label: { ...type.label, color: colors.textMuted },
  labelSelected: { color: colors.text },
});
