import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../../../config/product';
import type { SqlDb } from '../../../db/SqlDb';
import { useDb } from '../../../hooks/useDb';
import { useQuery } from '../../../hooks/useQuery';
import { useSingleFlight } from '../../../hooks/useSingleFlight';
import { en, formatDuration } from '../../../i18n/en';
import { systemClock } from '../../../services/clock';
import {
  completeQuestOfSession,
  dismissSummary,
  loadSessionSummary,
  rateSession,
  startBreak,
} from '../../../services/sessionService';
import { getTimerSettings } from '../../../services/settingsService';
import { Button } from '../../../ui/components/Button';
import { Panel } from '../../../ui/components/Panel';
import { colors, panelAlpha, space, touch, type } from '../../../ui/theme/tokens';

const RATINGS = Array.from({ length: PRODUCT.timer.ratingMax }, (_, index) => index + 1);

export default function SessionSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const router = useRouter();
  const [busy, run] = useSingleFlight();

  const fetcher = useCallback((conn: SqlDb) => (id ? loadSessionSummary(conn, id) : Promise.resolve(null)), [id]);
  const { data: summary, loading } = useQuery(['sessions', 'quests'], fetcher);
  const settings = useQuery(['settings'], getTimerSettings).data;

  const close = () =>
    run(async () => {
      await dismissSummary(db);
      router.replace('/quests');
    });

  const newSession = () =>
    run(async () => {
      await dismissSummary(db);
      router.replace('/focus' as Href);
    });

  const takeBreak = () =>
    run(async () => {
      const minutes = settings?.defaultBreakMin ?? PRODUCT.timer.defaultBreakMin;
      await startBreak(db, systemClock, minutes * 60);
      router.replace('/focus' as Href);
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>…</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{en.focus.summary.notFound}</Text>
        <Button label={en.focus.summary.close} variant="ghost" onPress={() => void close()} />
      </View>
    );
  }

  const { session, quest } = summary;
  const completed = session.status === 'completed';
  const breakMinutes = settings?.defaultBreakMin ?? PRODUCT.timer.defaultBreakMin;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        {completed ? en.focus.summary.completeTitle : en.focus.summary.savedTitle}
      </Text>

      <Panel alpha={panelAlpha.solid} style={styles.panel}>
        <View style={styles.stat}>
          <Text style={styles.label}>{en.focus.summary.focused}</Text>
          <Text style={styles.value}>{formatDuration(session.focusedSec ?? 0)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.label}>XP</Text>
          <Text style={styles.xp}>{en.focus.summary.xp(summary.xpEarned)}</Text>
        </View>
        {quest ? (
          <View style={styles.stat}>
            <Text style={styles.label}>{en.focus.summary.questLabel}</Text>
            <Text style={styles.questTitle} numberOfLines={2}>
              {quest.title}
            </Text>
          </View>
        ) : null}
      </Panel>

      <Panel alpha={panelAlpha.solid} style={styles.panel}>
        <Text style={styles.label}>
          {en.focus.summary.ratingTitle} · {en.focus.summary.ratingOptional}
        </Text>
        <View style={styles.stars}>
          {RATINGS.map((value) => {
            const filled = summary.rating !== null && value <= summary.rating;
            return (
              <Pressable
                key={value}
                onPress={() => void run(() => rateSession(db, systemClock, session.id, value))}
                style={styles.star}
                accessibilityRole="button"
                accessibilityState={{ selected: summary.rating === value }}
                accessibilityLabel={en.focus.summary.ratingA11y(value, PRODUCT.timer.ratingMax)}
              >
                <MaterialCommunityIcons
                  name={filled ? 'star' : 'star-outline'}
                  size={30}
                  color={filled ? colors.warning : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>
        {summary.rating === null ? (
          <Button label={en.focus.summary.skip} variant="ghost" onPress={() => void close()} />
        ) : null}
      </Panel>

      <View style={styles.actions}>
        {quest ? (
          quest.completable ? (
            <Button
              label={en.focus.summary.completeQuest}
              loading={busy}
              onPress={() => void run(async () => void (await completeQuestOfSession(db, systemClock, session.id)))}
            />
          ) : (
            <Text style={styles.done}>{en.focus.summary.questCompleted}</Text>
          )
        ) : null}
        <Button
          label={en.focus.summary.takeBreak(breakMinutes)}
          variant="ghost"
          disabled={busy}
          onPress={() => void takeBreak()}
        />
        <Button label={en.focus.summary.newSession} variant="ghost" disabled={busy} onPress={() => void newSession()} />
        <Button label={en.focus.summary.close} variant="ghost" disabled={busy} onPress={() => void close()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg },
  muted: { ...type.body, color: colors.textMuted },
  content: { padding: space.lg, gap: space.lg },
  title: { ...type.title, color: colors.text },
  panel: { gap: space.md },
  stat: { gap: space.xs },
  label: { ...type.label, color: colors.textMuted },
  value: { fontSize: 36, lineHeight: 42, fontWeight: '700', color: colors.text },
  xp: { ...type.h2, color: colors.actionBright },
  questTitle: { ...type.h2, color: colors.text },
  stars: { flexDirection: 'row', gap: space.xs },
  star: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: space.md },
  done: { ...type.label, color: colors.score.good, textAlign: 'center' },
});
