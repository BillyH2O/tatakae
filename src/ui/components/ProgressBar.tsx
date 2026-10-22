import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme/tokens';

/** Thin horizontal bar, `progress` in 0..1. Decorative: the value is always also given as text. */
export function ProgressBar({ progress, height = 4 }: { progress: number; height?: number }) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { height }]} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.actionMuted, borderRadius: radius.sm, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.actionBright, borderRadius: radius.sm },
});
