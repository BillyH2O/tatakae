import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { border, colors, radius, space, touch, type } from '../theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  accessibilityLabel?: string;
  children?: ReactNode;
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  accessibilityLabel,
}: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && isPrimary && styles.primaryPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.text : colors.actionBright} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.action },
  primaryPressed: { backgroundColor: colors.actionPressed },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: border.thin,
    borderColor: colors.borderStrong,
  },
  disabled: { opacity: 0.5 },
  label: { ...type.label, fontWeight: '600' },
  labelPrimary: { color: colors.text },
  labelGhost: { color: colors.actionBright },
});
