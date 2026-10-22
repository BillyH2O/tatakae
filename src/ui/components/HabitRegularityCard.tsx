import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HabitRegularityView } from '../../hooks/useStats';
import type { LocalDate } from '../../domain/types';
import { en } from '../../i18n/en';
import { colors, space, type } from '../theme/tokens';
import { HabitBadge } from './HabitBadge';
import { HabitHeatmap } from './HabitHeatmap';

/** One habit: badge, name, completion rate and streak, then its own regularity grid in its color. */
export function HabitRegularityCard({
  view,
  today,
  onPress,
}: {
  view: HabitRegularityView;
  today: LocalDate;
  onPress?: () => void;
}) {
  const { habit, grid, stats } = view;
  const streak =
    stats.planned === 0
      ? en.quests.habitStats.none
      : `${en.quests.habitStats.streak(stats.currentStreak)} · ${en.quests.habitStats.best(stats.bestStreak)}`;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={habit.title}
      >
        <HabitBadge icon={habit.icon} color={habit.color} size={36} />
        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={1}>
            {habit.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {streak}
          </Text>
        </View>
        {stats.ratePercent === null ? null : (
          <Text style={[styles.rate, { color: habit.color }]}>{en.quests.habitStats.rate(stats.ratePercent)}</Text>
        )}
      </Pressable>
      <HabitHeatmap
        grid={grid}
        color={habit.color}
        today={today}
        accessibilityLabel={en.stats.habits.a11y(habit.title, stats.done, stats.planned)}
        legend={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pressed: { opacity: 0.7 },
  main: { flex: 1, minWidth: 0, gap: 1 },
  title: { ...type.body, color: colors.text, fontWeight: '600' },
  sub: { ...type.caption, color: colors.textMuted },
  rate: { ...type.label, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
