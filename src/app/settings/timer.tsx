import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import { useDb } from '../../hooks/useDb';
import { useQuery } from '../../hooks/useQuery';
import { en } from '../../i18n/en';
import { getTimerSettings, saveTimerSettings } from '../../services/settingsService';
import { systemClock } from '../../services/clock';
import { Button } from '../../ui/components/Button';
import { Panel } from '../../ui/components/Panel';
import { SegmentedControl } from '../../ui/components/SegmentedControl';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

const focusOptions = PRODUCT.timer.focusPresetsMin.map((value) => ({
  value: String(value),
  label: en.onboarding.minutes(value),
}));
const breakOptions = PRODUCT.timer.breakPresetsMin.map((value) => ({
  value: String(value),
  label: en.onboarding.minutes(value),
}));

export default function SettingsTimerScreen() {
  const db = useDb();
  const router = useRouter();
  const { data, loading } = useQuery(['settings'], getTimerSettings);
  const [focus, setFocus] = useState<string | null>(null);
  const [brk, setBreak] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const focusValue = focus ?? (data ? String(data.defaultFocusMin) : String(PRODUCT.timer.defaultFocusMin));
  const breakValue = brk ?? (data ? String(data.defaultBreakMin) : String(PRODUCT.timer.defaultBreakMin));

  const save = async () => {
    setBusy(true);
    await saveTimerSettings(db, systemClock, {
      defaultFocusMin: Number(focusValue),
      defaultBreakMin: Number(breakValue),
    });
    setBusy(false);
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.profile} style={styles.panel}>
        <Text style={styles.title}>{en.settings.timerTitle}</Text>

        <Text style={styles.label}>{en.settings.defaultFocus}</Text>
        <SegmentedControl
          options={focusOptions}
          value={focusValue}
          onChange={setFocus}
        />

        <Text style={styles.label}>{en.settings.defaultBreak}</Text>
        <SegmentedControl
          options={breakOptions}
          value={breakValue}
          onChange={setBreak}
        />

        <Button label={en.settings.save} onPress={() => void save()} loading={busy} />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textMuted },
  content: { padding: space.lg },
  panel: { gap: space.lg },
  title: { ...type.title, color: colors.text },
  label: { ...type.label, color: colors.textMuted },
});
