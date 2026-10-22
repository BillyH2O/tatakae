import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, Text } from 'react-native';

import { PRODUCT } from '../../config/product';
import { useDb } from '../../hooks/useDb';
import { useQuery } from '../../hooks/useQuery';
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { en } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import {
  enableNotifications,
  getHabitReminderSummary,
  getNotificationStatus,
  type NotificationStatus,
  requestExactAlarm,
  syncAllNotifications,
} from '../../services/notificationService';
import { Button } from '../../ui/components/Button';
import { Panel } from '../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

function statusLabel(status: NotificationStatus): string {
  if (!status.supported) return en.notifications.statusUnavailable;
  if (status.permission === 'granted') return en.notifications.statusGranted;
  return status.permission === 'denied' ? en.notifications.statusDenied : en.notifications.statusUndetermined;
}

export default function SettingsNotificationsScreen() {
  const db = useDb();
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [busy, run] = useSingleFlight();
  const summary = useQuery(['quests', 'notifications'], getHabitReminderSummary).data;

  const refresh = useCallback(async () => {
    setStatus(await getNotificationStatus());
  }, []);

  // Status on open and each time the app returns from the system settings.
  useEffect(() => {
    let mounted = true;
    const load = () =>
      void getNotificationStatus().then((next) => {
        if (mounted) setStatus(next);
      });
    load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!status) return <Text style={styles.muted}>…</Text>;

  const needsPermission = status.supported && status.permission !== 'granted';
  const cap = PRODUCT.notifications.maxHabitReminders;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.profile} style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {en.notifications.title}
        </Text>

        <Text style={styles.label}>{en.notifications.status}</Text>
        <Text style={styles.value}>{statusLabel(status)}</Text>
        <Text style={styles.muted}>{en.notifications.explainTimer}</Text>
        <Text style={styles.muted}>{en.notifications.explainReminders}</Text>

        {needsPermission && status.permission === 'undetermined' ? (
          <Button
            label={en.notifications.enable}
            loading={busy}
            onPress={() => void run(async () => setStatus(await enableNotifications(db, systemClock)))}
          />
        ) : null}
        {needsPermission && status.permission === 'denied' ? (
          <Button
            label={en.notifications.openSystemSettings}
            variant="ghost"
            onPress={() => void Linking.openSettings()}
          />
        ) : null}

        {status.supported && status.permission === 'granted' && summary ? (
          <>
            <Text style={styles.muted}>{en.notifications.reminderCount(summary.scheduled)}</Text>
            {summary.skipped > 0 ? (
              <Text style={styles.warning}>{en.notifications.reminderCapWarning(summary.skipped, cap)}</Text>
            ) : null}
          </>
        ) : null}

        {status.exactAlarm !== 'notApplicable' ? (
          <>
            <Text style={styles.label}>{en.notifications.exactAlarm}</Text>
            <Text style={styles.value}>
              {status.exactAlarm === 'granted'
                ? en.notifications.exactAlarmGranted
                : en.notifications.exactAlarmDenied}
            </Text>
            {status.exactAlarm === 'denied' ? (
              <Button
                label={en.notifications.exactAlarmButton}
                variant="ghost"
                loading={busy}
                onPress={() =>
                  void run(async () => {
                    await requestExactAlarm();
                    await syncAllNotifications(db, systemClock);
                    await refresh();
                  })
                }
              />
            ) : null}
          </>
        ) : null}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  panel: { gap: space.sm },
  title: { ...type.title, color: colors.text, marginBottom: space.sm },
  label: { ...type.label, color: colors.textMuted },
  value: { ...type.body, color: colors.text },
  muted: { ...type.caption, color: colors.textMuted },
  warning: { ...type.caption, color: colors.danger },
});
