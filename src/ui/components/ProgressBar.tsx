import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/tokens';

/** Rounded horizontal bar, `progress` in 0..1. Decorative: the value is always also given as text. */
export function ProgressBar({ progress, height = 6 }: { progress: number; height?: number }) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = height / 2;
  return (
    <View
      style={[styles.track, { height, borderRadius: radius }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View style={[styles.fill, { width: `${clamped * 100}%`, borderRadius: radius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: 'rgba(47,123,255,0.22)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.bar },
});
