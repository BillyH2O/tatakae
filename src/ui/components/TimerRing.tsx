import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '../theme/tokens';

interface Props {
  size?: number;
  strokeWidth?: number;
  /** 0..1 share of the planned time; null draws a plain ring (stopwatch). */
  progress: number | null;
  children: ReactNode;
}

export function TimerRing({ size = 260, strokeWidth = 10, progress, children }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = progress === null ? 1 : Math.min(1, Math.max(0, progress));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, styles.rotated]}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progress === null ? colors.borderStrong : colors.actionBright}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - filled)}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Start the arc at 12 o'clock (SVG circles start at 3 o'clock).
  rotated: { transform: [{ rotate: '-90deg' }] },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
