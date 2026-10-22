import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { getSessionHistoryItem, listCategories, xpForSession } from '../../../db/repositories';
import type { SqlDb } from '../../../db/SqlDb';
import { xpDelta } from '../../../domain/sessionEdit';
import type { SessionHistoryItem } from '../../../domain/stats';
import { toLocalDate } from '../../../domain/time/localDate';
import { useDb } from '../../../hooks/useDb';
import { useQuery } from '../../../hooks/useQuery';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { en, formatDayLong, formatTimeOfDay } from '../../../i18n/en';
import { systemClock } from '../../../services/clock';
import { newId } from '../../../services/ids';
import { correctSession } from '../../../services/sessionService';
import { Button } from '../../../ui/components/Button';
import { CategoryPicker } from '../../../ui/components/CategoryPicker';
import { Panel } from '../../../ui/components/Panel';
import { editErrorText, parseMinutes } from '../../../ui/sessionErrors';
import { colors, panelAlpha, space, type } from '../../../ui/theme/tokens';

const SEC_PER_MIN = 60;
const loadCategories = (db: SqlDb) => listCategories(db, { includeArchived: true });

/** Loads the session once, then hands it to the form (whose fields start from the stored values). */
export default function EditSessionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemFetcher = useCallback((conn: SqlDb) => getSessionHistoryItem(conn, id), [id]);
  const item = useQuery(['sessions'], itemFetcher);

  if (item.data) return <EditForm key={item.data.id} session={item.data} />;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel alpha={panelAlpha.solid} style={styles.panel}>
        <Text style={styles.body}>{item.loading ? en.stats.loading : en.stats.form.errors.not_found}</Text>
      </Panel>
      <Button label={en.common.back} variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

/**
 * Correct a finished session: its duration (the end moves, the start stays) and its category.
 * The original is never overwritten silently: an audit row keeps the previous values and the
 * session is marked "Corrected". XP follows the new duration.
 */
function EditForm({ session }: { session: SessionHistoryItem }) {
  const db = useDb();
  const router = useRouter();
  const [busy, run] = useSingleFlight();

  const xpFetcher = useCallback((conn: SqlDb) => xpForSession(conn, session.id), [session.id]);
  const earned = useQuery(['xp'], xpFetcher).data;
  const categories = useQuery(['categories'], loadCategories).data;

  const initialMinutes = String(Math.round(session.focusedSec / SEC_PER_MIN));
  const [minutes, setMinutes] = useState(initialMinutes);
  const [categoryId, setCategoryId] = useState<string | null>(session.categoryId);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseMinutes(minutes);
  // An untouched duration keeps the exact stored seconds (sessions are not always whole minutes).
  const newFocusedSec =
    minutes === initialMinutes ? session.focusedSec : parsed === null ? Number.NaN : parsed * SEC_PER_MIN;
  const delta = earned !== undefined && Number.isFinite(newFocusedSec) ? xpDelta(earned, newFocusedSec) : null;

  const save = () =>
    run(async () => {
      const result = await correctSession(db, systemClock, newId, session.id, { focusedSec: newFocusedSec, categoryId });
      if (result.ok) router.back();
      else setError(editErrorText(result.error));
    });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {en.stats.form.editTitle}
          </Text>
          <Text style={styles.caption}>
            {en.stats.form.originalNote(formatDayLong(toLocalDate(session.startedAt)), formatTimeOfDay(session.startedAt))}
          </Text>

          <Text style={styles.label}>{en.stats.form.duration}</Text>
          <TextInput
            value={minutes}
            onChangeText={(text) => {
              setMinutes(text);
              setError(null);
            }}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel={en.stats.form.duration}
          />
          {delta === null ? null : <Text style={styles.caption}>{en.stats.form.xpDelta(delta)}</Text>}

          <Text style={styles.label}>{en.stats.form.category}</Text>
          {categories ? <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} /> : null}

          <Text style={styles.caption}>{en.stats.form.correctionNote}</Text>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
        </Panel>
        <Button
          label={en.stats.form.saveCorrection}
          onPress={save}
          loading={busy}
          disabled={parsed === null && minutes !== initialMinutes}
        />
        <Button label={en.common.cancel} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.lg },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  label: { ...type.label, color: colors.textMuted },
  caption: { ...type.caption, color: colors.textMuted },
  body: { ...type.body, color: colors.textMuted },
  error: { ...type.label, color: colors.danger },
  input: {
    ...type.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: space.md,
    minHeight: 44,
  },
});
