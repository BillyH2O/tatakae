import { Pressable, StyleSheet, Text } from 'react-native';

import { border, colors, glowStrong, radius, space, touch, type } from '../theme/tokens';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
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
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
  },
  selected: { backgroundColor: 'rgba(47,123,255,0.28)', borderColor: colors.borderStrong, boxShadow: glowStrong },
  label: { ...type.body, color: colors.textMuted },
  labelSelected: { color: colors.text, fontWeight: '600' },
});
