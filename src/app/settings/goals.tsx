import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getProfile, listDailyGoalVersions, listWeeklyGoalVersions } from '../../db/repositories';
import type { SqlDb } from '../../db/SqlDb';
import { resolveWeekGoal } from '../../domain/goals';
import { dailyDraftsFromVersions, type DailyGoalDraft } from '../../domain/onboardingGoals';
import type { IsoWeekday } from '../../domain/types';
import { weekStart } from '../../domain/time/localDate';
import { useDb } from '../../hooks/useDb';
import { useQuery } from '../../hooks/useQuery';
import { useToday } from '../../hooks/useToday';
import { en } from '../../i18n/en';
import { saveDailyGoals, saveWeeklyGoal } from '../../services/goalService';
import { systemClock } from '../../services/clock';
import { newId } from '../../services/ids';
import { Button } from '../../ui/components/Button';
import { DailyGoalEditor } from '../../ui/components/DailyGoalEditor';
import { Panel } from '../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

const loadGoals = async (db: SqlDb) => ({
  profile: await getProfile(db),
  daily: await listDailyGoalVersions(db),
  weekly: await listWeeklyGoalVersions(db),
});

export default function SettingsGoalsScreen() {
  const db = useDb();
  const router = useRouter();
  const today = useToday();
  const { data, loading } = useQuery(['goals', 'profile'], loadGoals);
  const [drafts, setDrafts] = useState<Record<IsoWeekday, DailyGoalDraft> | null>(null);
  const [weeklyText, setWeeklyText] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const initialDrafts = useMemo(() => {
    if (!data?.profile) return null;
    return dailyDraftsFromVersions(data.daily, data.profile.startLocalDate, today);
  }, [data, today]);

  const initialWeekly = useMemo(() => {
    if (!data) return '';
    const min = resolveWeekGoal(weekStart(today), data.weekly);
    return min === null ? '' : String(min);
  }, [data, today]);

  const dailyState = drafts ?? initialDrafts;
  const weeklyState = weeklyText ?? initialWeekly;

  const save = async () => {
    if (!dailyState) return;
    setBusy(true);
    const weeklyMin = weeklyState.trim() === '' ? null : Number(weeklyState.replace(/\D/g, ''));
    await saveDailyGoals(db, systemClock, newId, today, dailyState);
    await saveWeeklyGoal(db, systemClock, today, weeklyMin && weeklyMin > 0 ? weeklyMin : null);
    setSaved(true);
    setBusy(false);
    setTimeout(() => router.back(), 400);
  };

  if (loading || !dailyState) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Panel alpha={panelAlpha.profile} style={styles.panel}>
        <Text style={styles.title}>{en.settings.goalsTitle}</Text>
        <Text style={styles.note}>{en.settings.appliesFromToday}</Text>

        {([1, 2, 3, 4, 5, 6, 7] as const).map((weekday) => (
          <DailyGoalEditor
            key={weekday}
            weekday={weekday}
            value={dailyState[weekday]}
            onChange={(draft) =>
              setDrafts((prev) => ({ ...(prev ?? dailyState), [weekday]: draft }))
            }
          />
        ))}

        <Text style={styles.section}>{en.settings.weeklyGoalMin}</Text>
        <TextInput
          style={styles.input}
          value={weeklyState}
          onChangeText={(text) => setWeeklyText(text)}
          keyboardType="number-pad"
          placeholder={en.settings.noWeeklyGoal}
          placeholderTextColor={colors.textFaint}
        />

        {saved ? <Text style={styles.saved}>{en.settings.saved}</Text> : null}
        <Button label={en.settings.save} onPress={() => void save()} loading={busy} />
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textMuted },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  note: { ...type.caption, color: colors.warning },
  section: { ...type.h2, color: colors.text, marginTop: space.sm },
  input: {
    ...type.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 44,
  },
  saved: { ...type.caption, color: colors.score.good },
});
