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
import { TimerRing } from '../components/TimerRing';
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
      {showAlreadyRunning ? <Text style={styles.notice}>{en.focus.prepare.alreadyActive}</Text> : null}

      {quest ? (
        <Panel alpha={panelAlpha.solid} style={styles.questPanel}>
          <Text style={styles.questLabel}>{en.focus.prepare.quest}</Text>
          <Text style={styles.questTitle} numberOfLines={2}>
            {quest.title}
          </Text>
        </Panel>
      ) : null}

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

      <View style={styles.actions}>
        {paused ? (
          <Button
            label={en.focus.running.resume}
            loading={busy}
            onPress={() => void run(() => resumeSession(db, systemClock, session.id))}
          />
        ) : (
          <Button
            label={en.focus.running.pause}
            loading={busy}
            onPress={() => void run(() => pauseSession(db, systemClock, newId, session.id))}
          />
        )}
        {tooShort ? (
          <>
            <Text style={styles.note}>{en.focus.running.tooShort}</Text>
            <Button
              label={en.focus.running.discard}
              variant="ghost"
              disabled={busy}
              onPress={() => setDiscardOpen(true)}
            />
          </>
        ) : (
          <Button label={en.focus.running.finish} variant="ghost" disabled={busy} onPress={onFinishPress} />
        )}
      </View>

      <Text style={styles.note}>{en.focus.blockingUnavailable}</Text>

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
  content: { padding: space.lg, gap: space.xl, alignItems: 'center' },
  notice: { ...type.label, color: colors.warning, textAlign: 'center' },
  questPanel: { alignSelf: 'stretch', gap: space.xs },
  questLabel: { ...type.label, color: colors.textMuted },
  questTitle: { ...type.h2, color: colors.actionBright },
  ringWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.md },
  time: { fontSize: 56, lineHeight: 64, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  mode: { ...type.label, color: colors.textMuted },
  actions: { alignSelf: 'stretch', gap: space.md },
  note: { ...type.caption, color: colors.textFaint, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
