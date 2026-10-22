import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type SessionHistoryItem, sessionBadges } from '../../domain/stats';
import { toLocalDate } from '../../domain/time/localDate';
import { en, formatDayShort, formatDuration, formatTimeOfDay } from '../../i18n/en';
import { colors, space, touch, type } from '../theme/tokens';

function categoryLabel(item: SessionHistoryItem): string {
  if (item.categoryName === null) return en.stats.history.uncategorized;
  return item.categoryArchived ? `${item.categoryName} (${en.stats.history.archived})` : item.categoryName;
}

function describe(item: SessionHistoryItem) {
  const day = formatDayShort(toLocalDate(item.startedAt));
  const duration = formatDuration(item.focusedSec);
  const category = categoryLabel(item);
  const badges: string[] = sessionBadges(item).map((badge) => en.stats.history.badges[badge]);
  if (item.rating !== null) badges.push(en.stats.history.rated(item.rating));
  const range = en.stats.history.endsAt(formatTimeOfDay(item.startedAt), formatTimeOfDay(item.endedAt));
  return { day, duration, category, badges, range };
}

/** One finished session in the history: when, how long, category · quest, badges as plain text. */
export function SessionRow({ item, onPress }: { item: SessionHistoryItem; onPress: () => void }) {
  const { day, duration, category, badges, range } = describe(item);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={en.stats.history.rowA11y(day, duration, category, badges.join(', '))}
    >
      <View style={styles.line}>
        <Text style={styles.when} numberOfLines={1}>
          {en.stats.last.when(day, range)}
        </Text>
        <Text style={styles.duration}>{duration}</Text>
      </View>
      <Text style={styles.category} numberOfLines={1}>
        {item.questTitle ? `${category} · ${item.questTitle}` : category}
      </Text>
      {badges.length > 0 ? <Text style={styles.badges}>{badges.join(' · ')}</Text> : null}
    </Pressable>
  );
}

/** "Last session" block of the Stats screen: icon, title, when and duration, chevron. */
export function LastSessionCard({ item, onPress }: { item: SessionHistoryItem; onPress: () => void }) {
  const { day, duration, category, badges } = describe(item);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={en.stats.history.rowA11y(day, duration, category, badges.join(', '))}
    >
      <MaterialCommunityIcons name="file-document-outline" size={28} color={colors.actionBright} />
      <View style={styles.cardMain}>
        <Text style={styles.cardLabel}>{en.stats.last.title}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.questTitle ?? category}
        </Text>
      </View>
      <View style={styles.cardSide}>
        <Text style={styles.cardLabel} numberOfLines={1}>
          {en.stats.last.when(day, formatTimeOfDay(item.startedAt))}
        </Text>
        <Text style={styles.cardDuration}>{duration}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touch.min, paddingVertical: space.sm, gap: 2 },
  pressed: { opacity: 0.7 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  when: { ...type.label, color: colors.text, flexShrink: 1 },
  duration: { ...type.label, color: colors.cyan, fontWeight: '700', fontVariant: ['tabular-nums'] },
  category: { ...type.caption, color: colors.textMuted },
  badges: { ...type.caption, color: colors.textFaint },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: touch.min },
  cardMain: { flex: 1, minWidth: 0, gap: 2 },
  cardSide: { alignItems: 'flex-end', gap: 2 },
  cardLabel: { ...type.caption, color: colors.textMuted },
  cardTitle: { ...type.body, color: colors.text, fontWeight: '600' },
  cardDuration: { ...type.body, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
