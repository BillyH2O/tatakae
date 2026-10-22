import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { IsoWeekday } from '../../domain/types';
import { en } from '../../i18n/en';
import { border, colors, glowStrong, radius, space, touch, type } from '../theme/tokens';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const satisfies readonly IsoWeekday[];

/** Seven toggles Monday → Sunday: the days a habit is planned. */
export function WeekdayPicker({ value, onChange }: { value: readonly IsoWeekday[]; onChange: (days: IsoWeekday[]) => void }) {
  const toggle = (day: IsoWeekday) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());

  return (
    <View style={styles.row} accessibilityLabel={en.quests.habitDays}>
      {WEEKDAYS.map((day) => {
        const selected = value.includes(day);
        const label = en.weekdays.short[day - 1] ?? '';
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day)}
            style={[styles.day, selected && styles.dayOn]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={label}
          >
            <Text style={[styles.label, selected && styles.labelOn]} maxFontSizeMultiplier={1.2}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  day: {
    flex: 1,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
  },
  dayOn: { backgroundColor: 'rgba(47,123,255,0.28)', borderColor: colors.borderStrong, boxShadow: glowStrong },
  label: { ...type.caption, color: colors.textMuted },
  labelOn: { color: colors.text, fontWeight: '600' },
});
