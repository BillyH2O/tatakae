import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { getHabit, getOccurrence, getTask } from '../../services/questService';
import { useQuery } from '../../hooks/useQuery';
import { en } from '../../i18n/en';
import { Panel } from '../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

export default function FocusStubScreen() {
  const { taskId, occurrenceId } = useLocalSearchParams<{ taskId?: string; occurrenceId?: string }>();
  const { data: label } = useQuery(['quests'], async (db) => {
    if (taskId) {
      const task = await getTask(db, taskId);
      return task?.title ?? en.focus.freeSession;
    }
    if (occurrenceId) {
      const occurrence = await getOccurrence(db, occurrenceId);
      if (!occurrence) return en.focus.freeSession;
      const habit = await getHabit(db, occurrence.habitId);
      return habit?.title ?? en.focus.freeSession;
    }
    return en.focus.freeSession;
  });

  return (
    <View style={styles.root}>
      <Panel alpha={panelAlpha.solid} style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {en.focus.stubTitle}
        </Text>
        <Text style={styles.body}>{en.focus.stubBody}</Text>
        <Text style={styles.quest}>{label ?? '…'}</Text>
        <Text style={styles.note}>{en.focus.blockingUnavailable}</Text>
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.lg },
  panel: { gap: space.md },
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textMuted },
  quest: { ...type.h2, color: colors.actionBright },
  note: { ...type.caption, color: colors.textFaint },
});
