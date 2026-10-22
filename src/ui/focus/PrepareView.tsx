import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import { listCategories } from '../../db/repositories';
import type { SqlDb } from '../../db/SqlDb';
import type { SessionMode } from '../../domain/types';
import { useDb } from '../../hooks/useDb';
import { useQuery } from '../../hooks/useQuery';
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { en } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import { dataEvents } from '../../services/dataEvents';
import { newId } from '../../services/ids';
import { requestPermissionInContext } from '../../services/notificationService';
import { loadQuestTarget, startSession } from '../../services/sessionService';
import { getTimerSettings } from '../../services/settingsService';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Panel } from '../components/Panel';
import { QuestCard } from '../components/QuestCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { border, colors, panelAlpha, space, touch, type } from '../theme/tokens';

interface Props {
  taskId?: string;
  occurrenceId?: string;
}

const modeOptions = [
  { value: 'countdown', label: en.focus.prepare.countdown },
  { value: 'stopwatch', label: en.focus.prepare.stopwatch },
] as const;

const presetOptions = PRODUCT.timer.focusPresetsMin.map((value) => ({
  value: String(value),
  label: en.onboarding.minutes(value),
}));

/** Session preparation: quest (when launched from one), category, mode and duration. */
export function PrepareView({ taskId, occurrenceId }: Props) {
  const db = useDb();
  const questFetcher = useCallback(
    (conn: SqlDb) => loadQuestTarget(conn, { taskId, habitOccurrenceId: occurrenceId }),
    [taskId, occurrenceId],
  );
  const quest = useQuery(['quests'], questFetcher).data ?? null;
  const categories = useQuery(['categories'], listCategories).data ?? [];
  const settings = useQuery(['settings'], getTimerSettings).data;

  const [questDismissed, setQuestDismissed] = useState(false);
  const [categoryChoice, setCategoryChoice] = useState<string | null | undefined>(undefined);
  const [mode, setMode] = useState<SessionMode>('countdown');
  const [minutesChoice, setMinutesChoice] = useState<number | null>(null);
  const [busy, run] = useSingleFlight();

  const activeQuest = questDismissed ? null : quest;
  const wantedCategory = categoryChoice !== undefined ? categoryChoice : (activeQuest?.categoryId ?? null);
  // An archived category of the quest is no longer selectable: fall back to "Uncategorized".
  const categoryId = categories.some((category) => category.id === wantedCategory) ? wantedCategory : null;
  const minutes = minutesChoice ?? settings?.defaultFocusMin ?? PRODUCT.timer.defaultFocusMin;

  const step = (delta: number) => {
    const next = Math.min(PRODUCT.timer.maxFocusMin, Math.max(PRODUCT.timer.minFocusMin, minutes + delta));
    setMinutesChoice(next);
  };

  const start = () =>
    run(async () => {
      // Only a countdown needs an end alert. Asked once, in context; a refusal never blocks the session.
      if (mode === 'countdown') await requestPermissionInContext(db, systemClock);
      const result = await startSession(db, systemClock, newId, {
        mode,
        plannedSec: mode === 'countdown' ? minutes * 60 : null,
        categoryId,
        taskId: activeQuest?.taskId ?? null,
        habitOccurrenceId: activeQuest?.habitOccurrenceId ?? null,
      });
      // Refused because another session is active: the Focus screen switches to the running one.
      if (!result.ok) dataEvents.emit('sessions');
    });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title} accessibilityRole="header">
        {en.focus.title}
      </Text>

      <QuestCard
        title={activeQuest ? activeQuest.title : en.focus.freeSession}
        subtitle={categories.find((category) => category.id === categoryId)?.name ?? en.focus.prepare.uncategorized}
        right={
          activeQuest ? (
            <Pressable
              onPress={() => setQuestDismissed(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={en.focus.prepare.clearQuest}
            >
              <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          ) : undefined
        }
      />

      <Panel alpha={panelAlpha.solid} style={styles.panel}>
        <Text style={styles.label}>{en.focus.prepare.category}</Text>
        <View style={styles.chips}>
          <Chip
            label={en.focus.prepare.uncategorized}
            selected={categoryId === null}
            onPress={() => setCategoryChoice(null)}
          />
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={categoryId === category.id}
              onPress={() => setCategoryChoice(category.id)}
            />
          ))}
        </View>

        <Text style={styles.label}>{en.focus.prepare.mode}</Text>
        <SegmentedControl
          options={modeOptions}
          value={mode}
          onChange={setMode}
          accessibilityLabel={en.focus.prepare.mode}
        />

        {mode === 'countdown' ? (
          <>
            <Text style={styles.label}>{en.focus.prepare.duration}</Text>
            <SegmentedControl
              options={presetOptions}
              value={String(minutes)}
              onChange={(value) => setMinutesChoice(Number(value))}
              accessibilityLabel={en.focus.prepare.duration}
            />
            <View style={styles.stepper}>
              <Pressable
                onPress={() => step(-PRODUCT.timer.customStepMin)}
                disabled={minutes <= PRODUCT.timer.minFocusMin}
                style={[styles.stepBtn, minutes <= PRODUCT.timer.minFocusMin && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel={en.focus.prepare.decrease}
              >
                <MaterialCommunityIcons name="minus" size={24} color={colors.actionBright} />
              </Pressable>
              <Text style={styles.minutes} accessibilityLiveRegion="polite">
                {en.onboarding.minutes(minutes)}
              </Text>
              <Pressable
                onPress={() => step(PRODUCT.timer.customStepMin)}
                disabled={minutes >= PRODUCT.timer.maxFocusMin}
                style={[styles.stepBtn, minutes >= PRODUCT.timer.maxFocusMin && styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel={en.focus.prepare.increase}
              >
                <MaterialCommunityIcons name="plus" size={24} color={colors.actionBright} />
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.muted}>{en.focus.prepare.stopwatchHint}</Text>
        )}

        <View style={styles.blocking} accessible accessibilityLabel={en.focus.blockingUnavailable}>
          <MaterialCommunityIcons name="lock-open-variant-outline" size={18} color={colors.textMuted} />
          <Text style={styles.note}>{en.focus.blockingUnavailable}</Text>
        </View>
      </Panel>

      <Button label={en.focus.prepare.start} icon="play" large onPress={() => void start()} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.md },
  title: { ...type.title, color: colors.text },
  panel: { gap: space.md },
  label: { ...type.h2, fontWeight: '700', color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg },
  stepBtn: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: touch.min / 2,
    borderWidth: border.thin,
    borderColor: colors.border,
    backgroundColor: colors.cell,
  },
  disabled: { opacity: 0.35 },
  minutes: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: colors.cyan, minWidth: 130, textAlign: 'center' },
  blocking: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.xs },
  note: { ...type.label, fontWeight: '400', color: colors.textMuted, flex: 1 },
});
