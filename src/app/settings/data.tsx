import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { REAL_DB_NAME, DEMO_DB_NAME } from '../../config/databaseNames';
import { useDatabaseMode } from '../../hooks/useDatabaseMode';
import { useDb } from '../../hooks/useDb';
import { useSingleFlight } from '../../hooks/useSingleFlight';
import { en } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import { canSwitchDatabase, regenerateDemoData } from '../../services/demo/demoMode';
import { newId } from '../../services/ids';
import { Button } from '../../ui/components/Button';
import { Panel } from '../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

export default function SettingsDataScreen() {
  const db = useDb();
  const mode = useDatabaseMode();
  const [busy, run] = useSingleFlight();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const switchTo = (target: typeof REAL_DB_NAME | typeof DEMO_DB_NAME) =>
    run(async () => {
      setMessage(null);
      try {
        const allowed = await canSwitchDatabase(db);
        if (!allowed.ok) {
          setMessage({ text: en.demo.sessionActive, error: true });
          return;
        }
        mode.switchTo(target);
      } catch {
        setMessage({ text: en.demo.failed, error: true });
      }
    });

  const regenerate = () =>
    run(async () => {
      setMessage(null);
      try {
        const result = await regenerateDemoData(db, systemClock, newId, mode.name);
        setMessage(
          result.ok ? { text: en.demo.regenerated, error: false } : { text: en.demo.sessionActive, error: true },
        );
      } catch {
        setMessage({ text: en.demo.failed, error: true });
      }
    });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.profile} style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {en.demo.title}
        </Text>
        <Text style={styles.muted}>{en.demo.intro}</Text>
        <Text style={styles.value}>{mode.isDemo ? en.demo.statusDemo : en.demo.statusReal}</Text>

        {mode.isDemo ? (
          <>
            <Button label={en.demo.regenerate} variant="ghost" loading={busy} onPress={() => void regenerate()} />
            <Button label={en.demo.leave} loading={busy} onPress={() => void switchTo(REAL_DB_NAME)} />
          </>
        ) : (
          <Button label={en.demo.enter} loading={busy} onPress={() => void switchTo(DEMO_DB_NAME)} />
        )}

        {message ? (
          <Text style={message.error ? styles.error : styles.success} accessibilityLiveRegion="polite">
            {message.text}
          </Text>
        ) : null}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  value: { ...type.body, color: colors.text },
  muted: { ...type.caption, color: colors.textMuted },
  error: { ...type.caption, color: colors.danger },
  success: { ...type.caption, color: colors.actionBright },
});
