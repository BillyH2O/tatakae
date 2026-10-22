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
import { SegmentedControl } from '../components/SegmentedControl';
import { colors, panelAlpha, space, touch, type } from '../theme/tokens';

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

      <Panel alpha={panelAlpha.solid} style={styles.panel}>
        <Text style={styles.label}>{en.focus.prepare.quest}</Text>
        {activeQuest ? (
          <View style={styles.questRow}>
            <Text style={styles.questTitle} numberOfLines={2}>
              {activeQuest.title}
            </Text>
            <Pressable
              onPress={() => setQuestDismissed(true)}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={en.focus.prepare.clearQuest}
            >
              <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.muted}>{en.focus.freeSession}</Text>
        )}

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
              accent={category.color}
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
          <MaterialCommunityIcons name="shield-off-outline" size={18} color={colors.textFaint} />
          <Text style={styles.note}>{en.focus.blockingUnavailable}</Text>
        </View>

        <Button label={en.focus.prepare.start} onPress={() => void start()} loading={busy} />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  title: { ...type.title, color: colors.text },
  panel: { gap: space.md },
  label: { ...type.label, color: colors.textMuted },
  muted: { ...type.body, color: colors.textMuted },
  questRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  questTitle: { ...type.h2, color: colors.actionBright, flex: 1 },
  iconBtn: { padding: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg },
  stepBtn: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  minutes: { ...type.title, color: colors.text, minWidth: 110, textAlign: 'center' },
  blocking: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  note: { ...type.caption, color: colors.textFaint, flex: 1 },
});
