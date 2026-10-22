import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors, gradient } from '../theme/tokens';

interface Props {
  size?: number;
  strokeWidth?: number;
  /** 0..1 share of the planned time; null draws a plain ring (stopwatch). */
  progress: number | null;
  children: ReactNode;
}

const TRACK_WIDTH = 3;
const HALO_EXTRA = 10;

/** Thin glowing track with a bright gradient arc for the elapsed share, starting at 12 o'clock. */
export function TimerRing({ size = 270, strokeWidth = 9, progress, children }: Props) {
  const radius = (size - strokeWidth - HALO_EXTRA) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = progress === null ? 1 : Math.min(1, Math.max(0, progress));
  const dash = { strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: circumference * (1 - filled) };
  const center = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, styles.rotated]}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient.bar[1]} />
            <Stop offset="1" stopColor={gradient.bar[0]} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={radius} stroke={colors.border} strokeWidth={TRACK_WIDTH} fill="rgba(10,18,36,0.35)" />
        {filled > 0 ? (
          <>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.barBright}
              strokeOpacity={0.18}
              strokeWidth={strokeWidth + HALO_EXTRA}
              fill="none"
              strokeLinecap="round"
              {...dash}
            />
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#ring)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              {...dash}
            />
          </>
        ) : null}
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
