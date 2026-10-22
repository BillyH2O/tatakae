import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { habitWeekProgress, type HabitSchedule } from '../../domain/habits';
import { questsForDate, type QuestRow as QuestRowModel } from '../../domain/quests';
import type { Habit } from '../../domain/types';
import { weekRange } from '../../domain/totals';
import { listOccurrencesBetween } from '../../db/repositories/habits';
import type { SqlDb } from '../../db/SqlDb';
import { useDb } from '../../hooks/useDb';
import { useQuery } from '../../hooks/useQuery';
import { useToday } from '../../hooks/useToday';
import { en } from '../../i18n/en';
import {
  clearPriorityMissionIfInvalid,
  ensureOccurrenceHorizon,
  loadQuestContext,
  setPriorityMission,
  toggleOccurrenceComplete,
  toggleTaskComplete,
} from '../../services/questService';
import { systemClock } from '../../services/clock';
import { newId } from '../../services/ids';
import { Button } from '../../ui/components/Button';
import { CollapsibleSection } from '../../ui/components/CollapsibleSection';
import { EmptyState } from '../../ui/components/EmptyState';
import { Panel } from '../../ui/components/Panel';
import { QuestRow } from '../../ui/components/QuestRow';
import { SegmentedControl } from '../../ui/components/SegmentedControl';
import { TabScene } from '../../ui/components/TabScene';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

type QuestTab = 'today' | 'all';

export default function QuestsScreen() {
  const db = useDb();
  const router = useRouter();
  const today = useToday();
  const [tab, setTab] = useState<QuestTab>('today');

  useEffect(() => {
    void ensureOccurrenceHorizon(db, systemClock, newId).then(() =>
      clearPriorityMissionIfInvalid(db, systemClock),
    );
  }, [db]);

  const fetchToday = useCallback(
    async (conn: SqlDb) => {
      const ctx = await loadQuestContext(conn, today);
      const week = weekRange(today);
      const weekOccurrences = await listOccurrencesBetween(conn, week.from, week.to);
      return { ...ctx, weekOccurrences, today };
    },
    [today],
  );

  const { data } = useQuery(['quests', 'profile'], fetchToday);
  const view = useMemo(() => {
    if (!data) return null;
    return questsForDate(data.today, data.today, data.tasks, data.habits, data.occurrences, data.mission);
  }, [data]);

  const allOpenTasks = useMemo(
    () => data?.tasks.filter((task) => task.status === 'open') ?? [],
    [data],
  );
  const activeHabits = useMemo(
    () => data?.habits.filter((habit) => habit.status === 'active') ?? [],
    [data],
  );

  const schedule = (habit: Habit): HabitSchedule => ({
    weekdaysMask: habit.weekdaysMask,
    startLocalDate: habit.startLocalDate,
    archivedLocalDate: habit.archivedLocalDate,
    status: habit.status,
  });

  const startRow = (row: QuestRowModel) => {
    if (row.kind === 'task') {
      router.push(`/focus?taskId=${encodeURIComponent(row.task.id)}` as Href);
    } else {
      router.push(`/focus?occurrenceId=${encodeURIComponent(row.occurrence.id)}` as Href);
    }
  };

  const subtitleFor = (row: QuestRowModel) => {
    if (row.kind !== 'habit' || !data) return undefined;
    const progress = habitWeekProgress(
      schedule(row.habit),
      data.weekOccurrences.filter((o) => o.habitId === row.habit.id),
      today,
    );
    return en.quests.weekProgress(progress.done, progress.planned);
  };

  return (
    <TabScene>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {en.quests.title}
        </Text>
        <SegmentedControl
          options={[
            { value: 'today', label: en.quests.today },
            { value: 'all', label: en.quests.all },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'today' && view ? (
          <View style={styles.stack}>
            {view.mission ? (
              <Panel alpha={panelAlpha.quests}>
                <Text style={styles.section}>{en.quests.priorityMission}</Text>
                <QuestRow
                  row={view.mission}
                  subtitle={subtitleFor(view.mission)}
                  onToggleComplete={() =>
                    view.mission?.kind === 'task'
                      ? void toggleTaskComplete(db, systemClock, view.mission.task.id, today)
                      : view.mission?.kind === 'habit'
                        ? void toggleOccurrenceComplete(db, systemClock, view.mission.occurrence.id)
                        : undefined
                  }
                  onStart={() => startRow(view.mission!)}
                />
              </Panel>
            ) : null}

            {view.active.length === 0 && view.completed.length === 0 ? (
              <EmptyState
                message={en.quests.emptyToday}
                actionLabel={en.quests.addQuest}
                onAction={() => router.push('/quest/new' as Href)}
              />
            ) : (
              <Panel alpha={panelAlpha.quests} style={styles.stack}>
                {view.active.map((row) => (
                  <QuestRow
                    key={row.kind === 'task' ? row.task.id : row.occurrence.id}
                    row={row}
                    subtitle={subtitleFor(row)}
                    onToggleComplete={() =>
                      row.kind === 'task'
                        ? void toggleTaskComplete(db, systemClock, row.task.id, today)
                        : void toggleOccurrenceComplete(db, systemClock, row.occurrence.id)
                    }
                    onStart={() => startRow(row)}
                    onSetMission={() =>
                      void setPriorityMission(
                        db,
                        systemClock,
                        row.kind === 'task'
                          ? { kind: 'task', id: row.task.id }
                          : { kind: 'habit', id: row.habit.id },
                      )
                    }
                  />
                ))}
                <CollapsibleSection title={en.quests.completed} count={view.completed.length}>
                  {view.completed.map((row) => (
                    <QuestRow
                      key={row.kind === 'task' ? row.task.id : row.occurrence.id}
                      row={row}
                      onToggleComplete={() =>
                        row.kind === 'task'
                          ? void toggleTaskComplete(db, systemClock, row.task.id, today)
                          : void toggleOccurrenceComplete(db, systemClock, row.occurrence.id)
                      }
                      onStart={() => startRow(row)}
                    />
                  ))}
                </CollapsibleSection>
              </Panel>
            )}
          </View>
        ) : null}

        {tab === 'all' ? (
          <Panel alpha={panelAlpha.quests} style={styles.stack}>
            <Text style={styles.section}>{en.quests.tasks}</Text>
            {allOpenTasks.map((task) => (
              <QuestRow
                key={task.id}
                row={{ kind: 'task', task, overdue: false }}
                onToggleComplete={() => void toggleTaskComplete(db, systemClock, task.id, today)}
                onStart={() => router.push(`/focus?taskId=${encodeURIComponent(task.id)}` as Href)}
                onSetMission={() => void setPriorityMission(db, systemClock, { kind: 'task', id: task.id })}
              />
            ))}
            <Text style={styles.section}>{en.quests.habits}</Text>
            {activeHabits.map((habit) => (
              <PressableHabitRow
                key={habit.id}
                title={habit.title}
                onPress={() =>
                  router.push({ pathname: '/quest/habit/[id]', params: { id: habit.id } } as Href)
                }
              />
            ))}
          </Panel>
        ) : null}

        <Button label={en.quests.addQuest} onPress={() => router.push('/quest/new' as Href)} />
      </ScrollView>
    </TabScene>
  );
}

function PressableHabitRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Text onPress={onPress} style={styles.habitLink}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  title: { ...type.title, color: colors.text },
  stack: { gap: space.md },
  section: { ...type.h2, color: colors.text },
  habitLink: { ...type.body, color: colors.actionBright, minHeight: 44, textAlignVertical: 'center' },
});
