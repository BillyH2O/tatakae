import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestRow as QuestRowModel } from '../../domain/quests';
import { en } from '../../i18n/en';
import { colors, space, touch, type } from '../theme/tokens';

interface Props {
  row: QuestRowModel;
  subtitle?: string;
  onToggleComplete: () => void;
  onStart: () => void;
  onSetMission?: () => void;
}

export function QuestRow({ row, subtitle, onToggleComplete, onStart, onSetMission }: Props) {
  const done = row.kind === 'task' ? row.task.status === 'done' : row.occurrence.status === 'done';
  const title = row.kind === 'task' ? row.task.title : row.habit.title;
  const overdue = row.kind === 'task' && row.overdue;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggleComplete}
        style={styles.check}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? en.quests.reopen : en.quests.complete}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name={done ? 'check-circle' : 'circle-outline'}
          size={22}
          color={done ? colors.actionBright : colors.textMuted}
        />
      </Pressable>
      <View style={styles.main}>
        <Text style={[styles.title, done && styles.doneTitle]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {overdue ? <Text style={styles.badge}>{en.quests.overdue}</Text> : null}
      </View>
      {onSetMission ? (
        <Pressable onPress={onSetMission} style={styles.iconBtn} accessibilityLabel={en.quests.setMission}>
          <MaterialCommunityIcons name="star-outline" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
      {!done ? (
        <Pressable onPress={onStart} style={styles.start} accessibilityLabel={en.quests.start}>
          <MaterialCommunityIcons name="play" size={22} color={colors.actionBright} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min,
  },
  check: { padding: space.xs },
  main: { flex: 1, gap: 2 },
  title: { ...type.body, color: colors.text },
  doneTitle: { color: colors.textMuted, textDecorationLine: 'line-through' },
  subtitle: { ...type.caption, color: colors.textFaint },
  badge: { ...type.caption, color: colors.warning },
  iconBtn: { padding: space.xs },
  start: { padding: space.xs },
});
