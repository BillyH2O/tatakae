import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { border, colors, panel, panelAlpha, radius, space } from '../theme/tokens';

interface Props {
  children: ReactNode;
  alpha?: number;
  style?: StyleProp<ViewStyle>;
}

/** Dark, slightly transparent panel with a thin outline. Never nest panels; use dividers. */
export function Panel({ children, alpha = panelAlpha.home, style }: Props) {
  return <View style={[styles.panel, { backgroundColor: panel(alpha) }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: border.hairline,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.lg,
  },
});
