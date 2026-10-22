import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { DailyGoalDraft, DailyGoalMode } from '../../domain/onboardingGoals';
import type { IsoWeekday } from '../../domain/types';
import { en } from '../../i18n/en';
import { colors, space, type } from '../theme/tokens';
import { SegmentedControl } from './SegmentedControl';

const MODES = [
  { value: 'goal' as const, label: en.onboarding.goalModes.goal },
  { value: 'none' as const, label: en.onboarding.goalModes.none },
  { value: 'rest' as const, label: en.onboarding.goalModes.rest },
];

interface Props {
  weekday: IsoWeekday;
  value: DailyGoalDraft;
  onChange: (draft: DailyGoalDraft) => void;
}

export function DailyGoalEditor({ weekday, value, onChange }: Props) {
  const mode: DailyGoalMode = value.kind;
  const minutes = value.kind === 'goal' ? String(value.minutes) : '60';

  return (
    <View style={styles.row}>
      <Text style={styles.day}>{en.weekdays.short[weekday - 1]}</Text>
      <View style={styles.body}>
        <SegmentedControl
          options={MODES}
          value={mode}
          onChange={(next) => {
            if (next === 'goal') onChange({ kind: 'goal', minutes: Number(minutes) || 60 });
            else if (next === 'rest') onChange({ kind: 'rest' });
            else onChange({ kind: 'none' });
          }}
        />
        {mode === 'goal' ? (
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={minutes}
            onChangeText={(text) => {
              const parsed = Number(text.replace(/\D/g, ''));
              onChange({ kind: 'goal', minutes: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 });
            }}
            accessibilityLabel={`${en.weekdays.short[weekday - 1]} minutes`}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  day: { ...type.label, color: colors.text, width: 36, marginTop: space.sm },
  body: { flex: 1, gap: space.sm },
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
});
