import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TextInput } from 'react-native';

import { PRODUCT } from '../../config/product';
import { deadline } from '../../domain/timer/machine';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useDb } from '../../hooks/useDb';
import { useNow } from '../../hooks/useNow';
import { useQuery } from '../../hooks/useQuery';
import { en, formatDuration, formatTimeOfDay } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import { playSessionEndHaptic } from '../../services/feedback';
import { newId } from '../../services/ids';
import { syncAllNotifications, syncTimerNotifications } from '../../services/notificationService';
import {
  type FinishOptions,
  finishSession,
  getPendingSummarySessionId,
  heartbeat,
  reconcileActiveSession,
} from '../../services/sessionService';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { border, colors, radius, space, touch, type } from '../theme/tokens';

interface StopwatchConfirm {
  sessionId: string;
  lastSeenAt: number;
  elapsedSec: number;
}

const SEC_PER_MIN = 60;
const MS_PER_SEC = 1000;
const DEADLINE_TICK_MS = 1000;

/**
 * Root runtime of the timer (ARCHITECTURE.md §5.2): reconciles the active session on launch, on
 * foreground and when a countdown reaches its deadline, writes the heartbeat, asks before keeping
 * an abnormal stopwatch, and opens the summary of a finished session (also after a restart).
 */
export function SessionRuntime() {
  const db = useDb();
  const router = useRouter();
  const active = useActiveSession().data;
  const pending = useQuery(['sessions'], getPendingSummarySessionId).data;

  const [confirm, setConfirm] = useState<StopwatchConfirm | null>(null);
  const [durationMode, setDurationMode] = useState(false);
  const [durationText, setDurationText] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmRef = useRef<StopwatchConfirm | null>(null);
  const reconcilingRef = useRef(false);
  const navigatedSummaryRef = useRef<string | null>(null);

  const runReconcile = useCallback(async () => {
    if (reconcilingRef.current || confirmRef.current) return;
    reconcilingRef.current = true;
    try {
      const outcome = await reconcileActiveSession(db, systemClock, newId);
      if (outcome.type === 'confirmStopwatch') {
        confirmRef.current = outcome;
        setConfirm(outcome);
        return;
      }
      if (outcome.type === 'autoCompleted') playSessionEndHaptic();
      await heartbeat(db, systemClock);
      // Idempotent: also reschedules after the app was killed or the permission was just granted.
      await syncTimerNotifications(db, systemClock);
    } finally {
      reconcilingRef.current = false;
    }
  }, [db]);

  // Launch.
  useEffect(() => {
    void runReconcile();
  }, [runReconcile]);

  // Launch: habit reminders (and timer alerts) realigned with the stored state, once.
  useEffect(() => {
    void syncAllNotifications(db, systemClock);
  }, [db]);

  // Foreground: reconcile first (it reads the stored heartbeat); background: write the heartbeat.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runReconcile();
      else void heartbeat(db, systemClock);
    });
    return () => subscription.remove();
  }, [db, runReconcile]);

  // Heartbeat while a session is active (also re-checks an implausibly long stopwatch).
  const hasActive = Boolean(active);
  useEffect(() => {
    if (!hasActive) return undefined;
    const timer = setInterval(() => void runReconcile(), PRODUCT.timer.heartbeatSec * MS_PER_SEC);
    return () => clearInterval(timer);
  }, [hasActive, runReconcile]);

  // A countdown that reaches its deadline while the app is open.
  const countdownRunning = active?.session.mode === 'countdown' && active.session.status === 'running';
  const now = useNow(DEADLINE_TICK_MS, countdownRunning);
  const end = active && countdownRunning ? deadline(active.session, active.pauses) : null;
  const reachedDeadline = end !== null && now >= end;
  useEffect(() => {
    if (reachedDeadline) void runReconcile();
  }, [reachedDeadline, runReconcile]);

  // Summary of a finished session: shown once, and again after a restart until it is dismissed.
  useEffect(() => {
    if (pending === undefined) return;
    if (pending === null) {
      navigatedSummaryRef.current = null;
      return;
    }
    if (navigatedSummaryRef.current === pending) return;
    navigatedSummaryRef.current = pending;
    router.push(`/session/${pending}/summary` as Href);
  }, [pending, router]);

  const resolve = async (options: FinishOptions) => {
    const current = confirmRef.current;
    if (!current) return;
    setBusy(true);
    try {
      await finishSession(db, systemClock, newId, current.sessionId, options);
      playSessionEndHaptic();
    } finally {
      confirmRef.current = null;
      setConfirm(null);
      setDurationMode(false);
      setDurationText('');
      setBusy(false);
    }
  };

  const maxMinutes = confirm ? Math.max(1, Math.floor(confirm.elapsedSec / SEC_PER_MIN)) : 1;
  const minutes = Number(durationText);
  const durationValid = Number.isInteger(minutes) && minutes >= 1 && minutes <= maxMinutes;

  if (!confirm) return null;
  const elapsedLabel = formatDuration(confirm.elapsedSec);

  return (
    <ConfirmDialog
      visible
      title={en.focus.stopwatchGap.title}
      body={en.focus.stopwatchGap.body(elapsedLabel)}
      actions={
        durationMode ? (
          <>
            <Button
              label={en.focus.stopwatchGap.save}
              disabled={!durationValid}
              loading={busy}
              onPress={() => void resolve({ focusedSec: minutes * SEC_PER_MIN })}
            />
            <Button label={en.common.cancel} variant="ghost" onPress={() => setDurationMode(false)} />
          </>
        ) : (
          <>
            <Button
              label={en.focus.stopwatchGap.keepAll(elapsedLabel)}
              loading={busy}
              onPress={() => void resolve({ endAt: systemClock.now() })}
            />
            <Button
              label={en.focus.stopwatchGap.untilLastSeen(formatTimeOfDay(confirm.lastSeenAt))}
              variant="ghost"
              disabled={busy}
              onPress={() => void resolve({ endAt: confirm.lastSeenAt })}
            />
            <Button
              label={en.focus.stopwatchGap.enterDuration}
              variant="ghost"
              disabled={busy}
              onPress={() => setDurationMode(true)}
            />
          </>
        )
      }
    >
      {durationMode ? (
        <>
          <Text style={styles.label}>{en.focus.stopwatchGap.durationLabel(maxMinutes)}</Text>
          <TextInput
            value={durationText}
            onChangeText={setDurationText}
            keyboardType="number-pad"
            style={styles.input}
            placeholderTextColor={colors.textFaint}
            accessibilityLabel={en.focus.stopwatchGap.durationLabel(maxMinutes)}
            autoFocus
          />
          {durationText !== '' && !durationValid ? (
            <Text style={styles.error}>{en.focus.stopwatchGap.invalidDuration}</Text>
          ) : null}
        </>
      ) : null}
    </ConfirmDialog>
  );
}

const styles = StyleSheet.create({
  label: { ...type.label, color: colors.textMuted },
  input: {
    ...type.body,
    color: colors.text,
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: touch.min,
  },
  error: { ...type.caption, color: colors.danger },
});
