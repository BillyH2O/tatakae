import { StyleSheet, Text, TextInput } from 'react-native';

import { parseReminderTime } from '../../domain/notifications';
import { en } from '../../i18n/en';
import { colors, space, type } from '../theme/tokens';

/** Empty means "no reminder"; otherwise a 24 h `HH:MM` local time. */
export function isReminderValid(text: string): boolean {
  return text.trim() === '' || parseReminderTime(text.trim()) !== null;
}

/** Normalised value to store: `null` when empty. */
export function reminderValue(text: string): string | null {
  return text.trim() === '' ? null : text.trim();
}

interface Props {
  value: string;
  onChange: (text: string) => void;
}

export function ReminderField({ value, onChange }: Props) {
  const valid = isReminderValid(value);
  return (
    <>
      <Text style={styles.label}>{en.quests.reminder}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={en.quests.reminderPlaceholder}
        placeholderTextColor={colors.textFaint}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        style={[styles.input, !valid && styles.invalid]}
        accessibilityLabel={en.quests.reminder}
      />
      {valid ? null : <Text style={styles.error}>{en.quests.reminderInvalid}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  label: { ...type.label, color: colors.textMuted },
  input: {
    ...type.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: space.md,
    minHeight: 44,
  },
  invalid: { borderColor: colors.danger },
  error: { ...type.caption, color: colors.danger },
});
