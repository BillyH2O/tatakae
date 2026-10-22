import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import { en } from '../../i18n/en';
import { withAlpha } from '../theme/color';
import { border, colors, radius, space, touch, type } from '../theme/tokens';
import { HabitBadge, type IconName } from './HabitBadge';

interface Props {
  title: string;
  onTitleChange: (title: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  icon: string;
  onIconChange: (icon: string) => void;
}

const SWATCH = 24;

/** Name, color and icon of a habit, with a live preview next to the name. */
export function HabitStyleFields({ title, onTitleChange, color, onColorChange, icon, onIconChange }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>{en.quests.habitName}</Text>
      <View style={styles.nameRow}>
        <HabitBadge icon={icon} color={color} size={44} />
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder={en.quests.habitNamePlaceholder}
          placeholderTextColor={colors.textFaint}
          maxLength={PRODUCT.habits.maxTitleLength}
          style={styles.input}
          accessibilityLabel={en.quests.habitName}
        />
      </View>

      <Text style={styles.label}>{en.quests.habitColor}</Text>
      <View style={styles.swatches}>
        {PRODUCT.habits.colorPalette.map((value) => {
          const selected = value === color;
          return (
            <Pressable
              key={value}
              onPress={() => onColorChange(value)}
              hitSlop={(touch.min - SWATCH) / 2}
              style={[styles.swatchRing, selected && { borderColor: colors.text }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={en.quests.colorNames[value] ?? value}
            >
              <View style={[styles.swatch, { backgroundColor: value }]}>
                {selected ? <MaterialCommunityIcons name="check-bold" size={16} color={colors.bg} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{en.quests.habitIcon}</Text>
      <View style={styles.icons}>
        {PRODUCT.habits.iconChoices.map((value) => {
          const selected = value === icon;
          return (
            <Pressable
              key={value}
              onPress={() => onIconChange(value)}
              style={[
                styles.iconTile,
                selected && { borderColor: color, backgroundColor: withAlpha(color, 0.18) },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={en.quests.iconA11y(value)}
            >
              <MaterialCommunityIcons name={value as IconName} size={24} color={selected ? color : colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  label: { ...type.label, color: colors.textMuted, marginTop: space.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    ...type.body,
    flex: 1,
    minHeight: touch.min,
    color: colors.text,
    paddingHorizontal: space.md,
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    borderRadius: radius.md,
    backgroundColor: 'rgba(10,18,36,0.6)',
  },
  swatches: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchRing: {
    width: SWATCH + 6,
    height: SWATCH + 6,
    borderRadius: (SWATCH + 6) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2, alignItems: 'center', justifyContent: 'center' },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  iconTile: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
  },
});
