import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { border, colors, glow, panel, panelAlpha, radius, space } from '../theme/tokens';

interface Props {
  children: ReactNode;
  alpha?: number;
  /** `card`: dark outlined card over the landscape. `cell`: quiet inner block of a card (never nest a card). */
  variant?: 'card' | 'cell';
  style?: StyleProp<ViewStyle>;
}

/** The only container: a rounded, softly glowing card, or a flat cell inside one. */
export function Panel({ children, alpha = panelAlpha.home, variant = 'card', style }: Props) {
  return (
    <View
      style={[variant === 'card' ? styles.card : styles.cell, variant === 'card' && { backgroundColor: panel(alpha) }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.md,
    boxShadow: glow,
  },
  cell: {
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
    borderRadius: radius.md,
    padding: space.md,
  },
});
