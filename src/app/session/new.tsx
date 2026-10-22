import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { listCategories } from '../../db/repositories';
import type { SqlDb } from '../../db/SqlDb';
import { PRODUCT } from '../../config/product';
import { addDays, asLocalDate } from '../../domain/time/localDate';
import { useDb } from '../../hooks/useDb';
import { useQuery } from '../../hooks/useQuery';
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { useToday } from '../../hooks/useToday';
import { en, formatDayShort, formatTimeOfDay } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import { newId } from '../../services/ids';
import { loadQuestContext } from '../../services/questService';
import { createManualSession } from '../../services/sessionService';
import { Button } from '../../ui/components/Button';
import { CategoryPicker } from '../../ui/components/CategoryPicker';
import { Chip } from '../../ui/components/Chip';
import { ConfirmDialog } from '../../ui/components/ConfirmDialog';
import { Panel } from '../../ui/components/Panel';
import { editErrorText, parseMinutes } from '../../ui/sessionErrors';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

const RECENT_DAYS = 7;
const MS_PER_MIN = 60_000;
const loadCategories = (db: SqlDb) => listCategories(db);

type QuestChoice = { kind: 'task' | 'habit'; id: string } | null;

/** Add a past session by hand. It is marked "Manual entry"; never in the future. */
export default function NewSessionScreen() {
  const db = useDb();
  const router = useRouter();
  const today = useToday();
  const [busy, run] = useSingleFlight();

  const [dayChoice, setDayChoice] = useState<string | null>(null);
  const date = asLocalDate(dayChoice ?? today);
  const [time, setTime] = useState(() => formatTimeOfDay(systemClock.now() - PRODUCT.timer.defaultFocusMin * MS_PER_MIN));
  const [minutes, setMinutes] = useState(String(PRODUCT.timer.defaultFocusMin));
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [quest, setQuest] = useState<QuestChoice>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverlap, setConfirmOverlap] = useState(false);

  const categories = useQuery(['categories'], loadCategories).data;
  const questFetcher = useCallback((conn: SqlDb) => loadQuestContext(conn, date), [date]);
  const questData = useQuery(['quests'], questFetcher).data;

  const questChoices = useMemo(() => {
    if (!questData) return [];
    const tasks = questData.tasks
      .filter((task) => task.status === 'open')
      .map((task) => ({ kind: 'task' as const, id: task.id, title: task.title }));
    const habits = questData.occurrences.flatMap((occurrence) => {
      const habit = questData.habits.find((candidate) => candidate.id === occurrence.habitId);
      return habit ? [{ kind: 'habit' as const, id: occurrence.id, title: habit.title }] : [];
    });
    return [...tasks, ...habits];
  }, [questData]);

  const days = Array.from({ length: RECENT_DAYS }, (_, index) => addDays(today, -index));
  const parsedMinutes = parseMinutes(minutes);

  const submit = (allowOverlap: boolean) =>
    run(async () => {
      const result = await createManualSession(db, systemClock, newId, {
        date,
        time,
        durationMin: parsedMinutes ?? Number.NaN,
        categoryId,
        taskId: quest?.kind === 'task' ? quest.id : null,
        habitOccurrenceId: quest?.kind === 'habit' ? quest.id : null,
        allowOverlap,
      });
      if (result.ok) {
        router.back();
      } else if (result.error === 'overlap') {
        setConfirmOverlap(true);
      } else {
        setError(editErrorText(result.error));
      }
    });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {en.stats.form.newTitle}
          </Text>

          <Text style={styles.label}>{en.stats.form.date}</Text>
          <View style={styles.wrap}>
            {days.map((day, index) => (
              <Chip
                key={day}
                label={index === 0 ? en.stats.form.today : formatDayShort(day)}
                selected={day === date}
                onPress={() => {
                  setDayChoice(day);
                  setQuest(null);
                  setError(null);
                }}
              />
            ))}
          </View>

          <Text style={styles.label}>{en.stats.form.startTime}</Text>
          <TextInput
            value={time}
            onChangeText={(text) => {
              setTime(text);
              setError(null);
            }}
            style={styles.input}
            placeholder="09:30"
            placeholderTextColor={colors.textFaint}
            maxLength={5}
            accessibilityLabel={en.stats.form.startTime}
          />

          <Text style={styles.label}>{en.stats.form.duration}</Text>
          <TextInput
            value={minutes}
            onChangeText={(text) => {
              setMinutes(text);
              setError(null);
            }}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel={en.stats.form.duration}
          />

          <Text style={styles.label}>{en.stats.form.category}</Text>
          {categories ? <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} /> : null}

          <Text style={styles.label}>{en.stats.form.quest}</Text>
          <View style={styles.wrap}>
            <Chip label={en.stats.form.noQuest} selected={quest === null} onPress={() => setQuest(null)} />
            {questChoices.map((choice) => (
              <Chip
                key={`${choice.kind}:${choice.id}`}
                label={choice.title}
                selected={quest?.kind === choice.kind && quest.id === choice.id}
                onPress={() => setQuest({ kind: choice.kind, id: choice.id })}
              />
            ))}
          </View>

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </Panel>
        <Button label={en.stats.form.save} onPress={() => submit(false)} loading={busy} />
        <Button label={en.common.cancel} variant="ghost" onPress={() => router.back()} />
      </ScrollView>

      <ConfirmDialog
        visible={confirmOverlap}
        title={en.stats.form.overlapTitle}
        body={en.stats.form.overlapBody}
        onRequestClose={() => setConfirmOverlap(false)}
        actions={
          <>
            <Button
              label={en.stats.form.overlapConfirm}
              onPress={() => {
                setConfirmOverlap(false);
                void submit(true);
              }}
            />
            <Button label={en.common.cancel} variant="ghost" onPress={() => setConfirmOverlap(false)} />
          </>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, gap: space.lg },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  label: { ...type.label, color: colors.textMuted },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  error: { ...type.label, color: colors.danger },
  input: {
    ...type.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: space.md,
    minHeight: 44,
  },
});
