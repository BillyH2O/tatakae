import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import type { RadarAxisId, RadarAxisResult } from '../../domain/radar';
import { en } from '../../i18n/en';
import { colors } from '../theme/tokens';
import { radarAxisA11y } from './radarText';

const VIEW = 200;
const CENTER = VIEW / 2;
const RADIUS = 64;
const LABEL_RADIUS = RADIUS + 22;
const RINGS = [1 / 3, 2 / 3, 1] as const;
const HIT_SIZE = 44;
/** SVG text does not inherit the app font on web (it falls back to a serif). */
const FONT_FAMILY = Platform.OS === 'web' ? 'system-ui, -apple-system, Segoe UI, sans-serif' : undefined;

// Fixed layout: Strength top, Endurance right, Mental bottom, Consistency left.
const ANGLES: Record<RadarAxisId, number> = {
  strength: -Math.PI / 2,
  endurance: 0,
  mental: Math.PI / 2,
  consistency: Math.PI,
};

const point = (axis: RadarAxisId, radius: number) => ({
  x: CENTER + Math.cos(ANGLES[axis]) * radius,
  y: CENTER + Math.sin(ANGLES[axis]) * radius,
});

/**
 * Pure helper (tested): the vertices actually drawn. An axis without enough data has no vertex;
 * the polygon needs at least three, otherwise only the points are drawn.
 */
export function radarVertices(axes: readonly RadarAxisResult[]) {
  return axes.flatMap((axis) =>
    axis.value === null ? [] : [{ axis: axis.axis, ...point(axis.axis, (Math.min(100, axis.value) / 100) * RADIUS) }],
  );
}

interface Props {
  axes: readonly RadarAxisResult[];
  selected: RadarAxisId | null;
  onSelect: (axis: RadarAxisId) => void;
}

/** Four-axis radar. The exact values and explanations live in `RadarLegend` (always rendered). */
export function RadarChart({ axes, selected, onSelect }: Props) {
  const vertices = radarVertices(axes);
  const polygon = vertices.length >= 3 ? vertices.map((vertex) => `${vertex.x},${vertex.y}`).join(' ') : null;

  return (
    <View style={styles.box} accessibilityLabel={en.home.form.chartA11y}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW} ${VIEW}`}>
        {RINGS.map((ring) => (
          <Circle key={ring} cx={CENTER} cy={CENTER} r={RADIUS * ring} fill="none" stroke={colors.cellBorder} strokeWidth={1} />
        ))}
        {axes.map((axis) => {
          const end = point(axis.axis, RADIUS);
          return <Line key={axis.axis} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} stroke={colors.border} strokeWidth={1} />;
        })}
        {polygon ? <Polygon points={polygon} fill="rgba(47,140,255,0.38)" stroke={colors.barBright} strokeWidth={2} /> : null}
        {axes.map((axis) => {
          const label = point(axis.axis, LABEL_RADIUS);
          const vertex = vertices.find((candidate) => candidate.axis === axis.axis);
          const isSelected = selected === axis.axis;
          return (
            <G key={axis.axis}>
              <SvgText
                x={label.x}
                y={label.y + 4}
                fontSize={12}
                fontFamily={FONT_FAMILY}
                fontWeight={isSelected ? '700' : '500'}
                textAnchor="middle"
                fill={isSelected ? colors.actionBright : colors.textMuted}
              >
                {en.home.form.axesShort[axis.axis]}
              </SvgText>
              {vertex ? <Circle cx={vertex.x} cy={vertex.y} r={isSelected ? 6 : 4} fill={colors.actionBright} /> : null}
            </G>
          );
        })}
      </Svg>
      {axes.map((axis) => {
        const label = point(axis.axis, LABEL_RADIUS);
        return (
          <Pressable
            key={axis.axis}
            accessibilityRole="button"
            accessibilityLabel={radarAxisA11y(axis)}
            onPress={() => onSelect(axis.axis)}
            style={[styles.hit, { left: `${(label.x / VIEW) * 100}%`, top: `${(label.y / VIEW) * 100}%` }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 1, maxWidth: 220, alignSelf: 'center' },
  hit: { position: 'absolute', width: HIT_SIZE, height: HIT_SIZE, marginLeft: -HIT_SIZE / 2, marginTop: -HIT_SIZE / 2 },
});
