import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { border, colors, glowStrong, gradient, radius, space, touch, type } from '../theme/tokens';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  icon?: IconName;
  /** Taller button for the main action of a screen. */
  large?: boolean;
  accessibilityLabel?: string;
  children?: ReactNode;
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  icon,
  large,
  accessibilityLabel,
}: Props) {
  const isPrimary = variant === 'primary';
  const inactive = Boolean(disabled || loading);
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        isPrimary ? styles.primary : styles.ghost,
        inactive && styles.disabled,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive }}
    >
      {isPrimary ? (
        <LinearGradient
          colors={gradient.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.fill]}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={large ? 24 : 20} color={colors.text} /> : null}
          <Text style={[styles.label, large && styles.labelLarge]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min + 4,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    overflow: 'hidden',
  },
  large: { minHeight: 54 },
  primary: { borderWidth: border.thin, borderColor: 'rgba(130,190,255,0.7)', boxShadow: glowStrong },
  fill: { borderRadius: radius.md },
  ghost: {
    backgroundColor: 'rgba(10,18,36,0.7)',
    borderWidth: border.thin,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  label: { ...type.body, fontWeight: '600', color: colors.text },
  labelLarge: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
});
