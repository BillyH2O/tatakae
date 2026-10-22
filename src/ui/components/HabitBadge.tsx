import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { resolveHabitStyle } from '../../domain/habitStyle';
import { withAlpha } from '../theme/color';
import { radius } from '../theme/tokens';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** The habit's icon in its color, on a soft tinted tile. Unknown values fall back to the default look. */
export function HabitBadge({ icon, color, size = 32 }: { icon: string; color: string; size?: number }) {
  const style = resolveHabitStyle({ icon, color });
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size > 36 ? radius.md : radius.md - 2,
          backgroundColor: withAlpha(style.color, 0.16),
          borderColor: withAlpha(style.color, 0.45),
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MaterialCommunityIcons name={style.icon as IconName} size={Math.round(size * 0.58)} color={style.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
