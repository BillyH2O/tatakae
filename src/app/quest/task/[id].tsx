import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import type { Task } from '../../../domain/types';
import { getTask, updateTask, archiveTaskQuest } from '../../../services/questService';
import { useQuery } from '../../../hooks/useQuery';
import { useDb } from '../../../hooks/useDb';
import { en } from '../../../i18n/en';
import { systemClock } from '../../../services/clock';
import { Button } from '../../../ui/components/Button';
import { Panel } from '../../../ui/components/Panel';
import { colors, panelAlpha, space, type } from '../../../ui/theme/tokens';

function TaskEditor({ task }: { task: Task }) {
  const db = useDb();
  const router = useRouter();
  const [title, setTitle] = useState(task.title);

  return (
    <Panel alpha={panelAlpha.quests} style={styles.panel}>
      <Text style={styles.heading}>{en.quests.taskDetail}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholderTextColor={colors.textFaint}
      />
      <Button
        label={en.settings.save}
        onPress={async () => {
          await updateTask(db, task.id, { title }, systemClock.now());
        }}
      />
      <Button
        label={en.quests.archive}
        variant="ghost"
        onPress={async () => {
          await archiveTaskQuest(db, systemClock, task.id);
          router.back();
        }}
      />
    </Panel>
  );
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: task } = useQuery(['quests'], async (conn) => (id ? getTask(conn, id) : null));

  if (!task) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.muted}>…</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <TaskEditor key={task.id} task={task} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingVertical: space.sm },
  panel: { gap: space.md },
  heading: { ...type.h2, color: colors.text },
  input: {
    ...type.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: space.md,
    minHeight: 44,
  },
  muted: { ...type.body, color: colors.textMuted },
});
