import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type SessionHistoryItem, sessionBadges } from '../../domain/stats';
import { toLocalDate } from '../../domain/time/localDate';
import { en, formatDayShort, formatDuration, formatTimeOfDay } from '../../i18n/en';
import { border, colors, radius, space, touch, type } from '../theme/tokens';

function categoryLabel(item: SessionHistoryItem): string {
  if (item.categoryName === null) return en.stats.history.uncategorized;
  return item.categoryArchived ? `${item.categoryName} (${en.stats.history.archived})` : item.categoryName;
}

/** One finished session: when, how long, category, quest, badges. Opens the correction screen. */
export function SessionRow({ item, onPress }: { item: SessionHistoryItem; onPress: () => void }) {
  const day = formatDayShort(toLocalDate(item.startedAt));
  const duration = formatDuration(item.focusedSec);
  const badges = sessionBadges(item).map((badge) => en.stats.history.badges[badge]);
  const category = categoryLabel(item);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={en.stats.history.rowA11y(day, duration, category, badges.join(', '))}
    >
      <View style={styles.main}>
        <View style={styles.line}>
          <Text style={styles.when} numberOfLines={1}>
            {en.stats.last.when(day, en.stats.history.endsAt(formatTimeOfDay(item.startedAt), formatTimeOfDay(item.endedAt)))}
          </Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
        <Text style={styles.category} numberOfLines={1}>
          {item.questTitle ? `${category} · ${item.questTitle}` : category}
        </Text>
        {badges.length > 0 || item.rating !== null ? (
          <View style={styles.badges}>
            {badges.map((label) => (
              <Text key={label} style={styles.badge}>
                {label}
              </Text>
            ))}
            {item.rating !== null ? <Text style={styles.badge}>{en.stats.history.rated(item.rating)}</Text> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touch.min, paddingVertical: space.sm, borderRadius: radius.sm },
  pressed: { backgroundColor: colors.actionMuted },
  main: { gap: 2 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  when: { ...type.label, color: colors.text, flexShrink: 1 },
  duration: { ...type.label, color: colors.actionBright, fontVariant: ['tabular-nums'] },
  category: { ...type.caption, color: colors.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: 2 },
  badge: {
    ...type.caption,
    fontSize: 11,
    color: colors.textMuted,
    borderWidth: border.hairline,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
