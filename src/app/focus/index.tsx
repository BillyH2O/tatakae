import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useActiveSession } from '../../hooks/useActiveSession';
import { useQuery } from '../../hooks/useQuery';
import { getActiveBreak } from '../../services/sessionService';
import { BreakView } from '../../ui/focus/BreakView';
import { PrepareView } from '../../ui/focus/PrepareView';
import { RunningView } from '../../ui/focus/RunningView';
import { colors, type } from '../../ui/theme/tokens';

/** Focus: the running session when there is one, else a break in progress, else preparation. */
export default function FocusScreen() {
  const { taskId, occurrenceId } = useLocalSearchParams<{ taskId?: string; occurrenceId?: string }>();
  const active = useActiveSession().data;
  const activeBreak = useQuery(['sessions'], getActiveBreak).data;

  if (active === undefined || activeBreak === undefined) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>…</Text>
      </View>
    );
  }

  if (active) {
    const otherQuest =
      (taskId !== undefined && active.session.taskId !== taskId) ||
      (occurrenceId !== undefined && active.session.habitOccurrenceId !== occurrenceId);
    return <RunningView state={active} showAlreadyRunning={otherQuest} />;
  }
  if (activeBreak) return <BreakView breakState={activeBreak} />;
  return <PrepareView taskId={taskId} occurrenceId={occurrenceId} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...type.body, color: colors.textMuted },
});
