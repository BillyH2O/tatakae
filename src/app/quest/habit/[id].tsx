import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { habitCalendarState, weekdaysFromMask, type HabitSchedule } from '../../../domain/habits';
import { monthDays } from '../../../domain/time/localDate';
import { getHabit, listOccurrencesForHabit, archiveHabitQuest } from '../../../services/questService';
import { useQuery } from '../../../hooks/useQuery';
import { useToday } from '../../../hooks/useToday';
import { useDb } from '../../../hooks/useDb';
import { en } from '../../../i18n/en';
import { systemClock } from '../../../services/clock';
import { Button } from '../../../ui/components/Button';
import { Panel } from '../../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../../ui/theme/tokens';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const router = useRouter();
  const today = useToday();
  const { data } = useQuery(['quests'], async (conn) => {
    const habit = id ? await getHabit(conn, id) : null;
    const occurrences = id ? await listOccurrencesForHabit(conn, id) : [];
    return { habit, occurrences };
  });

  const month = useMemo(() => monthDays(today), [today]);
  const schedule: HabitSchedule | null = data?.habit
    ? {
        weekdaysMask: data.habit.weekdaysMask,
        startLocalDate: data.habit.startLocalDate,
        archivedLocalDate: data.habit.archivedLocalDate,
        status: data.habit.status,
      }
    : null;

  if (!data?.habit || !schedule) {
    return (
      <View style={styles.root}>
        <Text style={styles.body}>…</Text>
      </View>
    );
  }

  const habit = data.habit;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.quests} style={styles.panel}>
        <Text style={styles.title}>{habit.title}</Text>
        <Text style={styles.meta}>
          {weekdaysFromMask(habit.weekdaysMask)
            .map((day) => en.weekdays.short[day - 1])
            .join(' · ')}
        </Text>
        <Text style={styles.section}>{en.quests.calendarLegend}</Text>
        <View style={styles.grid}>
          {month.map((day) => {
            const occurrence = data.occurrences.find((o) => o.localDate === day) ?? null;
            const state = habitCalendarState(day, schedule, occurrence, today);
            return (
              <View key={day} style={styles.cell}>
                <Text style={styles.cellDay}>{day.slice(-2)}</Text>
                <Text style={styles.cellState}>{en.quests.states[state]}</Text>
              </View>
            );
          })}
        </View>
        <Button
          label={en.quests.archive}
          variant="ghost"
          onPress={async () => {
            await archiveHabitQuest(db, systemClock, habit.id);
            router.back();
          }}
        />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg },
  content: { padding: space.lg },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  meta: { ...type.caption, color: colors.textMuted },
  section: { ...type.label, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  cell: {
    width: '13%',
    minWidth: 36,
    padding: space.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    alignItems: 'center',
  },
  cellDay: { ...type.caption, color: colors.text },
  cellState: { fontSize: 9, color: colors.textFaint },
  body: { ...type.body, color: colors.textMuted },
});
