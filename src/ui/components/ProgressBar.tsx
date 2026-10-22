import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { colors, gradient } from '../theme/tokens';

/** Rounded horizontal bar, `progress` in 0..1. Decorative: the value is always also given as text. */
export function ProgressBar({ progress, height = 8 }: { progress: number; height?: number }) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = height / 2;
  return (
    <View
      style={[styles.track, { height, borderRadius: radius }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {clamped > 0 ? (
        <LinearGradient
          colors={gradient.bar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${Math.max(clamped * 100, 4)}%`, borderRadius: radius }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', boxShadow: '0 0 6px rgba(76,182,255,0.55)' },
});
