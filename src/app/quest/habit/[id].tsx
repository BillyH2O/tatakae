import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { habitCalendarState, weekdaysFromMask, type HabitSchedule } from '../../../domain/habits';
import { monthDays } from '../../../domain/time/localDate';
import {
  archiveHabitQuest,
  getHabit,
  listOccurrencesForHabit,
  updateHabitReminder,
} from '../../../services/questService';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useQuery } from '../../../hooks/useQuery';
import { useToday } from '../../../hooks/useToday';
import { useDb } from '../../../hooks/useDb';
import { en } from '../../../i18n/en';
import { systemClock } from '../../../services/clock';
import { Button } from '../../../ui/components/Button';
import { Panel } from '../../../ui/components/Panel';
import { ReminderField, isReminderValid, reminderValue } from '../../../ui/components/ReminderField';
import { colors, panelAlpha, space, type } from '../../../ui/theme/tokens';

function ReminderEditor({ habitId, current }: { habitId: string; current: string | null }) {
  const db = useDb();
  const [text, setText] = useState(current ?? '');
  const [busy, run] = useSingleFlight();
  const changed = reminderValue(text) !== current;

  return (
    <View style={styles.editor}>
      <ReminderField value={text} onChange={setText} />
      <Button
        label={en.quests.reminderSave}
        variant="ghost"
        disabled={!changed || !isReminderValid(text)}
        loading={busy}
        onPress={() => void run(() => updateHabitReminder(db, systemClock, habitId, reminderValue(text)))}
      />
    </View>
  );
}

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
        <ReminderEditor key={`${habit.id}:${habit.reminderTime ?? ''}`} habitId={habit.id} current={habit.reminderTime} />
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
  content: { paddingHorizontal: space.md, paddingVertical: space.sm },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  meta: { ...type.caption, color: colors.textMuted },
  editor: { gap: space.sm },
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
