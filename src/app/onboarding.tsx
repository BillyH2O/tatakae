import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PRODUCT } from '../config/product';
import { defaultDailyGoalDrafts, type DailyGoalDraft } from '../domain/onboardingGoals';
import type { IsoWeekday } from '../domain/types';
import { useDb } from '../hooks/useDb';
import { en } from '../i18n/en';
import {
  completeOnboarding,
  defaultOnboardingWeeklyGoalMin,
} from '../services/profileService';
import { systemClock } from '../services/clock';
import { newId } from '../services/ids';
import { Avatar } from '../ui/components/Avatar';
import { Button } from '../ui/components/Button';
import { DailyGoalEditor } from '../ui/components/DailyGoalEditor';
import { Panel } from '../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../ui/theme/tokens';

export default function OnboardingScreen() {
  const db = useDb();
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [dailyGoals, setDailyGoals] = useState<Record<IsoWeekday, DailyGoalDraft>>(() =>
    defaultDailyGoalDrafts(),
  );
  const [weeklyGoal, setWeeklyGoal] = useState(String(defaultOnboardingWeeklyGoalMin()));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmed = name.trim();
  const nameOk =
    trimmed.length >= 1 && trimmed.length <= PRODUCT.profile.maxNameLength;

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const weeklyMin = useMemo(() => {
    const parsed = Number(weeklyGoal.replace(/\D/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [weeklyGoal]);

  const finish = async () => {
    if (!nameOk) {
      setError(en.onboarding.nameInvalid(PRODUCT.profile.maxNameLength));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await completeOnboarding(
        db,
        systemClock,
        { displayName: trimmed, avatarUri, dailyGoals, weeklyGoalMin: weeklyMin },
        newId,
      );
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Panel alpha={panelAlpha.home} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {en.onboarding.title}
          </Text>
          <Text style={styles.subtitle}>{en.onboarding.subtitle}</Text>

          <View style={styles.identity}>
            <Avatar uri={avatarUri} size={72} />
            <Button
              label={avatarUri ? en.onboarding.photoChange : en.onboarding.photoAdd}
              variant="ghost"
              onPress={() => void pickPhoto()}
            />
          </View>

          <Text style={styles.label}>{en.onboarding.nameLabel}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={en.onboarding.namePlaceholder}
            maxLength={PRODUCT.profile.maxNameLength}
            autoCapitalize="words"
            accessibilityLabel={en.onboarding.nameLabel}
          />

          <Text style={styles.section}>{en.onboarding.dailyGoals}</Text>
          {([1, 2, 3, 4, 5, 6, 7] as const).map((weekday) => (
            <DailyGoalEditor
              key={weekday}
              weekday={weekday}
              value={dailyGoals[weekday]}
              onChange={(draft) => setDailyGoals((prev) => ({ ...prev, [weekday]: draft }))}
            />
          ))}

          <Text style={styles.section}>{en.onboarding.weeklyGoal}</Text>
          <Text style={styles.hint}>{en.onboarding.weeklyHint}</Text>
          <TextInput
            style={styles.input}
            value={weeklyGoal}
            onChangeText={setWeeklyGoal}
            keyboardType="number-pad"
            accessibilityLabel={en.onboarding.weeklyGoal}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={en.onboarding.start} onPress={() => void finish()} loading={loading} disabled={!nameOk} />
        </Panel>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xl * 2 },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  subtitle: { ...type.body, color: colors.textMuted },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  label: { ...type.label, color: colors.textMuted },
  section: { ...type.h2, color: colors.text, marginTop: space.sm },
  hint: { ...type.caption, color: colors.textFaint },
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
  error: { ...type.caption, color: colors.danger },
});
