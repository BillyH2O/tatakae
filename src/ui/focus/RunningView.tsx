import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { deadline, canDiscard, timerView } from '../../domain/timer/machine';
import type { StopReason } from '../../domain/types';
import { PRODUCT } from '../../config/product';
import type { SqlDb } from '../../db/SqlDb';
import type { ActiveSessionState } from '../../hooks/useActiveSession';
import { useDb } from '../../hooks/useDb';
import { useNow } from '../../hooks/useNow';
import { useQuery } from '../../hooks/useQuery';
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { en, formatClock, formatDuration } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import { playSessionEndHaptic } from '../../services/feedback';
import { newId } from '../../services/ids';
import {
  finishSession,
  loadQuestTarget,
  pauseSession,
  resumeSession,
} from '../../services/sessionService';
import { getTimerSettings } from '../../services/settingsService';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Panel } from '../components/Panel';
import { QuestCard } from '../components/QuestCard';
import { TimerRing } from '../components/TimerRing';
import { listCategories } from '../../db/repositories';
import { colors, panelAlpha, space, type } from '../theme/tokens';

const TICK_MS = 250;
const KEEP_AWAKE_TAG = 'tatakae-focus-session';
const REASONS = PRODUCT.timer.stopReasons;

interface Props {
  state: ActiveSessionState;
  /** True when the screen was opened for another quest while this session is running. */
  showAlreadyRunning: boolean;
}

export function RunningView({ state, showAlreadyRunning }: Props) {
  const db = useDb();
  const { session, pauses } = state;
  const now = useNow(TICK_MS);
  const [busy, run] = useSingleFlight();
  const [finishOpen, setFinishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [reason, setReason] = useState<StopReason | null>(null);

  const questFetcher = useCallback(
    (conn: SqlDb) =>
      loadQuestTarget(conn, { taskId: session.taskId, habitOccurrenceId: session.habitOccurrenceId }),
    [session.taskId, session.habitOccurrenceId],
  );
  const quest = useQuery(['quests'], questFetcher).data ?? null;
  const categories = useQuery(['categories'], listCategories).data;
  const categoryName =
    categories?.find((category) => category.id === session.categoryId)?.name ?? en.focus.prepare.uncategorized;
  const keepScreenOn = useQuery(['settings'], getTimerSettings).data?.keepScreenOn ?? false;

  useEffect(() => {
    if (!keepScreenOn) return undefined;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [keepScreenOn]);

  const paused = session.status === 'paused';
  const view = timerView(session, pauses, now);
  const isCountdown = session.mode === 'countdown';
  const shown = isCountdown ? (view.remainingSec ?? 0) : view.focusedSec;
  const end = !paused ? deadline(session, pauses) : null;
  const beforeDeadline = isCountdown && !(end !== null && now >= end);
  const tooShort = canDiscard(view.focusedSec);
  const modeLabel = isCountdown
    ? en.focus.running.countdownLabel(Math.round((session.plannedSec ?? 0) / 60))
    : en.focus.running.stopwatchLabel;

  const finish = (options: { reason?: StopReason | null } = {}) =>
    run(async () => {
      await finishSession(db, systemClock, newId, session.id, options);
      playSessionEndHaptic();
      setFinishOpen(false);
      setReason(null);
    });

  const onFinishPress = () => {
    // A countdown stopped before its deadline asks first (with an optional reason).
    if (beforeDeadline) setFinishOpen(true);
    else void finish();
  };

  const discard = () =>
    run(async () => {
      await finishSession(db, systemClock, newId, session.id, { discard: true });
      setDiscardOpen(false);
    });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        {en.focus.title}
      </Text>
      {showAlreadyRunning ? <Text style={styles.notice}>{en.focus.prepare.alreadyActive}</Text> : null}

      <QuestCard
        title={quest ? quest.title : en.focus.freeSession}
        subtitle={categoryName}
      />

      <View style={styles.ringWrap}>
        <TimerRing progress={view.progress}>
          <Text
            style={styles.time}
            maxFontSizeMultiplier={1.2}
            accessibilityLabel={en.focus.running.timerA11y(formatDuration(shown))}
          >
            {formatClock(shown)}
          </Text>
          <Text style={styles.mode}>{paused ? en.focus.running.paused : modeLabel}</Text>
        </TimerRing>
      </View>

      <Panel alpha={panelAlpha.solid} style={styles.blocking}>
        <MaterialCommunityIcons name="lock-open-variant-outline" size={20} color={colors.textMuted} />
        <Text style={styles.blockingText}>{en.focus.blockingUnavailable}</Text>
      </Panel>

      {tooShort ? <Text style={styles.note}>{en.focus.running.tooShort}</Text> : null}
      <View style={styles.actions}>
        <View style={styles.action}>
          {paused ? (
            <Button
              label={en.focus.running.resume}
              icon="play"
              variant="ghost"
              large
              loading={busy}
              onPress={() => void run(() => resumeSession(db, systemClock, session.id))}
            />
          ) : (
            <Button
              label={en.focus.running.pause}
              icon="pause"
              variant="ghost"
              large
              loading={busy}
              onPress={() => void run(() => pauseSession(db, systemClock, newId, session.id))}
            />
          )}
        </View>
        <View style={styles.action}>
          {tooShort ? (
            <Button
              label={en.focus.running.discard}
              icon="close"
              variant="ghost"
              large
              disabled={busy}
              onPress={() => setDiscardOpen(true)}
            />
          ) : (
            <Button label={en.focus.running.finish} icon="stop" large disabled={busy} onPress={onFinishPress} />
          )}
        </View>
      </View>

      <ConfirmDialog
        visible={finishOpen}
        title={en.focus.running.finishTitle}
        body={en.focus.running.finishBody(formatDuration(view.focusedSec))}
        onRequestClose={() => setFinishOpen(false)}
        actions={
          <>
            <Button
              label={en.focus.running.confirmFinish}
              loading={busy}
              onPress={() => void finish({ reason })}
            />
            <Button
              label={en.focus.running.keepGoing}
              variant="ghost"
              disabled={busy}
              onPress={() => setFinishOpen(false)}
            />
          </>
        }
      >
        <Text style={styles.questLabel}>{en.focus.running.reasonLabel}</Text>
        <View style={styles.chips}>
          {REASONS.map((value) => (
            <Chip
              key={value}
              label={en.focus.running.reasons[value]}
              selected={reason === value}
              onPress={() => setReason(reason === value ? null : value)}
            />
          ))}
        </View>
      </ConfirmDialog>

      <ConfirmDialog
        visible={discardOpen}
        title={en.focus.running.discardTitle}
        body={en.focus.running.discardBody}
        onRequestClose={() => setDiscardOpen(false)}
        actions={
          <>
            <Button label={en.focus.running.confirmDiscard} loading={busy} onPress={() => void discard()} />
            <Button
              label={en.focus.running.keepGoing}
              variant="ghost"
              disabled={busy}
              onPress={() => setDiscardOpen(false)}
            />
          </>
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.md },
  title: { ...type.title, color: colors.text },
  notice: { ...type.label, color: colors.warning },
  questLabel: { ...type.label, color: colors.textMuted },
  ringWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm },
  time: { fontSize: 64, lineHeight: 72, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  mode: { ...type.body, fontSize: 17, color: colors.textMuted },
  blocking: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  blockingText: { ...type.label, fontWeight: '400', color: colors.textMuted, flex: 1 },
  actions: { flexDirection: 'row', gap: space.md },
  action: { flex: 1 },
  note: { ...type.caption, color: colors.textFaint, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
