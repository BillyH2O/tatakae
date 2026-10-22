import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IconName } from './Button';
import { border, colors, radius, space, type } from '../theme/tokens';

/** Rows of one list inside a single outlined cell, separated by hairlines. */
export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

interface RowProps {
  label: string;
  icon?: IconName;
  value?: string;
  onPress: () => void;
  separated?: boolean;
}

/** Navigation row: icon, label, optional value, chevron. */
export function ListRow({ label, icon, value, onPress, separated }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, separated && styles.separated, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={22} color={colors.actionBright} /> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.md },
  separated: { borderTopWidth: border.thin, borderTopColor: colors.cellBorder },
  pressed: { backgroundColor: 'rgba(47,123,255,0.08)' },
  label: { ...type.body, color: colors.text, flex: 1 },
  value: { ...type.label, fontWeight: '400', color: colors.textMuted },
});
