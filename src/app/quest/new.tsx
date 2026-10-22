import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import { maskFromWeekdays } from '../../domain/habits';
import { normalizeHabitTitle } from '../../domain/habitStyle';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import type { IsoWeekday, TaskPriority } from '../../domain/types';
import { useDb } from '../../hooks/useDb';
import { en } from '../../i18n/en';
import { createHabitQuest, createTaskQuest } from '../../services/questService';
import { systemClock } from '../../services/clock';
import { newId } from '../../services/ids';
import { Button } from '../../ui/components/Button';
import { HabitStyleFields } from '../../ui/components/HabitStyleFields';
import { Panel } from '../../ui/components/Panel';
import { ReminderField, isReminderValid, reminderValue } from '../../ui/components/ReminderField';
import { SegmentedControl } from '../../ui/components/SegmentedControl';
import { WeekdayPicker } from '../../ui/components/WeekdayPicker';
import { border, colors, panelAlpha, radius, space, touch, type } from '../../ui/theme/tokens';

type Kind = 'task' | 'habit';

export default function NewQuestScreen() {
  const db = useDb();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('task');
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<string>(PRODUCT.habits.defaultColor);
  const [icon, setIcon] = useState<string>(PRODUCT.habits.defaultIcon);
  const [days, setDays] = useState<IsoWeekday[]>([1, 2, 3, 4, 5]);
  const [due, setDue] = useState<'none' | 'today' | 'tomorrow'>('none');
  const [reminder, setReminder] = useState('');
  const [loading, setLoading] = useState(false);
  const canSave =
    normalizeHabitTitle(title) !== null && (kind === 'task' || (days.length > 0 && isReminderValid(reminder)));

  const save = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      const id = newId();
      if (kind === 'task') {
        const today = toLocalDate(systemClock.now());
        const dueDate = due === 'today' ? today : due === 'tomorrow' ? addDays(today, 1) : null;
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
            title,
            color,
            icon,
            categoryId: null,
            weekdaysMask: maskFromWeekdays(days),
            reminderTime: reminderValue(reminder),
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
          {kind === 'task' ? (
            <>
              <Text style={styles.label}>{en.quests.taskTitle}</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                placeholderTextColor={colors.textFaint}
                maxLength={PRODUCT.habits.maxTitleLength}
                accessibilityLabel={en.quests.taskTitle}
              />
              <Text style={styles.label}>{en.quests.dueDate}</Text>
              <SegmentedControl
                options={[
                  { value: 'none', label: en.quests.noDueDate },
                  { value: 'today', label: en.quests.dueToday },
                  { value: 'tomorrow', label: en.quests.dueTomorrow },
                ]}
                value={due}
                onChange={setDue}
              />
            </>
          ) : (
            <>
              <HabitStyleFields
                title={title}
                onTitleChange={setTitle}
                color={color}
                onColorChange={setColor}
                icon={icon}
                onIconChange={setIcon}
              />
              <View style={styles.group}>
                <Text style={styles.label}>{en.quests.habitDays}</Text>
                <WeekdayPicker value={days} onChange={setDays} />
              </View>
              <View style={styles.group}>
                <ReminderField value={reminder} onChange={setReminder} />
              </View>
            </>
          )}
        </Panel>
        <Button label={en.settings.save} onPress={save} loading={loading} disabled={!canSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.lg },
  panel: { gap: space.sm },
  group: { gap: space.sm },
  label: { ...type.label, color: colors.textMuted, marginTop: space.xs },
  input: {
    ...type.body,
    color: colors.text,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    borderRadius: radius.md,
    backgroundColor: 'rgba(10,18,36,0.6)',
  },
});
