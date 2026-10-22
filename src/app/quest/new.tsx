import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { maskFromWeekdays } from '../../domain/habits';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import type { IsoWeekday, TaskPriority } from '../../domain/types';
import { useDb } from '../../hooks/useDb';
import { en } from '../../i18n/en';
import { createHabitQuest, createTaskQuest } from '../../services/questService';
import { systemClock } from '../../services/clock';
import { newId } from '../../services/ids';
import { Button } from '../../ui/components/Button';
import { Panel } from '../../ui/components/Panel';
import { SegmentedControl } from '../../ui/components/SegmentedControl';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

type Kind = 'task' | 'habit';

export default function NewQuestScreen() {
  const db = useDb();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('task');
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<IsoWeekday[]>([1, 2, 3, 4, 5]);
  const [due, setDue] = useState<'none' | 'today' | 'tomorrow'>('none');
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: IsoWeekday) => {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort(),
    );
  };

  const save = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const id = newId();
      if (kind === 'task') {
        const today = toLocalDate(systemClock.now());
        const dueDate =
          due === 'today' ? today : due === 'tomorrow' ? addDays(today, 1) : null;
        await createTaskQuest(db, systemClock, {
          id,
          title: title.trim(),
          categoryId: null,
          dueDate,
          priority: 1 as TaskPriority,
        });
      } else {
        await createHabitQuest(
          db,
          systemClock,
          {
            id,
            title: title.trim(),
            categoryId: null,
            weekdaysMask: maskFromWeekdays(days),
            reminderTime: null,
          },
          newId,
        );
      }
      router.back();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SegmentedControl
          options={[
            { value: 'task', label: en.quests.newTask },
            { value: 'habit', label: en.quests.newHabit },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Panel alpha={panelAlpha.quests} style={styles.panel}>
          <Text style={styles.label}>{en.quests.taskTitle}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholderTextColor={colors.textFaint}
            maxLength={120}
          />
          {kind === 'task' ? (
            <SegmentedControl
              options={[
                { value: 'none', label: en.quests.noDueDate },
                { value: 'today', label: en.quests.dueToday },
                { value: 'tomorrow', label: en.quests.dueTomorrow },
              ]}
              value={due}
              onChange={setDue}
            />
          ) : (
            <View style={styles.days}>
              {en.weekdays.short.map((label, index) => {
                const day = (index + 1) as IsoWeekday;
                const selected = days.includes(day);
                return (
                  <Text
                    key={label}
                    onPress={() => toggleDay(day)}
                    style={[styles.dayChip, selected && styles.dayChipOn]}
                  >
                    {label}
                  </Text>
                );
              })}
            </View>
          )}
        </Panel>
        <Button label={en.settings.save} onPress={save} loading={loading} disabled={!title.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.lg },
  panel: { gap: space.md },
  label: { ...type.label, color: colors.textMuted },
  input: {
    ...type.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: space.md,
    minHeight: 44,
  },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dayChip: {
    ...type.caption,
    color: colors.textMuted,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    minWidth: 44,
    textAlign: 'center',
  },
  dayChipOn: { borderColor: colors.borderStrong, color: colors.actionBright },
});
