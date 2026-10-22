import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../../../config/product';
import {
  habitRegularity,
  habitRegularityGrid,
  maskFromWeekdays,
  weekdaysFromMask,
} from '../../../domain/habits';
import { normalizeHabitTitle } from '../../../domain/habitStyle';
import type { Habit, IsoWeekday } from '../../../domain/types';
import {
  archiveHabitQuest,
  getHabit,
  listOccurrencesForHabit,
  updateHabitDetails,
  updateHabitReminder,
  updateHabitSchedule,
} from '../../../services/questService';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { useQuery } from '../../../hooks/useQuery';
import { useToday } from '../../../hooks/useToday';
import { useDb } from '../../../hooks/useDb';
import { en } from '../../../i18n/en';
import { systemClock } from '../../../services/clock';
import { newId } from '../../../services/ids';
import { Button } from '../../../ui/components/Button';
import { HabitBadge } from '../../../ui/components/HabitBadge';
import { HabitHeatmap } from '../../../ui/components/HabitHeatmap';
import { HabitStyleFields } from '../../../ui/components/HabitStyleFields';
import { Panel } from '../../../ui/components/Panel';
import { ReminderField, isReminderValid, reminderValue } from '../../../ui/components/ReminderField';
import { WeekdayPicker } from '../../../ui/components/WeekdayPicker';
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

/** Name, color, icon and planned days; saved together. */
function HabitEditor({ habit }: { habit: Habit }) {
  const db = useDb();
  const [title, setTitle] = useState(habit.title);
  const [color, setColor] = useState(habit.color);
  const [icon, setIcon] = useState(habit.icon);
  const [days, setDays] = useState<IsoWeekday[]>(weekdaysFromMask(habit.weekdaysMask));
  const [busy, run] = useSingleFlight();

  const mask = maskFromWeekdays(days);
  const detailsChanged = title.trim() !== habit.title || color !== habit.color || icon !== habit.icon;
  const scheduleChanged = mask !== habit.weekdaysMask;
  const canSave = normalizeHabitTitle(title) !== null && days.length > 0 && (detailsChanged || scheduleChanged);

  const save = () =>
    run(async () => {
      if (detailsChanged) await updateHabitDetails(db, systemClock, habit.id, { title, color, icon });
      if (scheduleChanged) await updateHabitSchedule(db, systemClock, habit.id, { weekdaysMask: mask }, newId);
    });

  return (
    <Panel variant="cell" style={styles.cell}>
      <Text style={styles.cellTitle} accessibilityRole="header">
        {en.quests.habitEdit}
      </Text>
      <HabitStyleFields
        title={title}
        onTitleChange={setTitle}
        color={color}
        onColorChange={setColor}
        icon={icon}
        onIconChange={setIcon}
      />
      <Text style={styles.label}>{en.quests.habitDays}</Text>
      <WeekdayPicker value={days} onChange={setDays} />
      <Button label={en.quests.habitSave} disabled={!canSave} loading={busy} onPress={() => void save()} />
    </Panel>
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

  const habit = data?.habit ?? null;
  const regularity = useMemo(() => {
    if (!data?.habit) return null;
    const grid = habitRegularityGrid(data.habit, data.occurrences, today, PRODUCT.stats.heatmapWeeks);
    return { grid, stats: habitRegularity(grid) };
  }, [data, today]);

  if (!habit || !regularity) {
    return (
      <View style={styles.root}>
        <Text style={styles.body}>…</Text>
      </View>
    );
  }

  const { grid, stats } = regularity;
  const summary =
    stats.planned === 0
      ? en.quests.habitStats.none
      : [
          en.quests.habitStats.rate(stats.ratePercent ?? 0),
          en.quests.habitStats.streak(stats.currentStreak),
          en.quests.habitStats.best(stats.bestStreak),
        ].join(' · ');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.quests} style={styles.panel}>
        <View style={styles.hero}>
          <HabitBadge icon={habit.icon} color={habit.color} size={48} />
          <View style={styles.heroText}>
            <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
              {habit.title}
            </Text>
            <Text style={styles.meta}>
              {weekdaysFromMask(habit.weekdaysMask)
                .map((day) => en.weekdays.short[day - 1])
                .join(' · ')}
            </Text>
          </View>
        </View>

        <Panel variant="cell" style={styles.cell}>
          <View style={styles.cellHead}>
            <Text style={styles.cellTitle} accessibilityRole="header">
              {en.quests.regularityTitle}
            </Text>
            <Text style={styles.meta}>{en.stats.habits.subtitle(PRODUCT.stats.heatmapWeeks)}</Text>
          </View>
          <Text style={[styles.summary, { color: habit.color }]}>{summary}</Text>
          <HabitHeatmap
            grid={grid}
            color={habit.color}
            today={today}
            accessibilityLabel={en.stats.habits.a11y(habit.title, stats.done, stats.planned)}
          />
        </Panel>

        <HabitEditor key={`${habit.id}:${habit.updatedAt}`} habit={habit} />

        <Panel variant="cell" style={styles.cell}>
          <ReminderEditor key={`${habit.id}:${habit.reminderTime ?? ''}`} habitId={habit.id} current={habit.reminderTime} />
        </Panel>

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
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroText: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...type.title, color: colors.text },
  meta: { ...type.caption, color: colors.textMuted },
  cell: { gap: space.md },
  cellHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cellTitle: { ...type.h2, color: colors.text },
  summary: { ...type.label, fontWeight: '700' },
  label: { ...type.label, color: colors.textMuted },
  editor: { gap: space.sm },
  body: { ...type.body, color: colors.textMuted },
});
