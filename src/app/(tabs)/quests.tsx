import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type Href, useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listCategories } from '../../db/repositories';
import { listOccurrencesBetween } from '../../db/repositories/habits';
import type { SqlDb } from '../../db/SqlDb';
import { habitWeekProgress, weekdaysFromMask, type HabitSchedule } from '../../domain/habits';
import { questsForDate, type QuestRow as QuestRowModel } from '../../domain/quests';
import { weekRange } from '../../domain/totals';
import type { Habit } from '../../domain/types';
import { useDb } from '../../hooks/useDb';
import { useQuery } from '../../hooks/useQuery';
import { useToday } from '../../hooks/useToday';
import { en } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import { newId } from '../../services/ids';
import {
  clearPriorityMissionIfInvalid,
  ensureOccurrenceHorizon,
  loadQuestContext,
  setPriorityMission,
  toggleOccurrenceComplete,
  toggleTaskComplete,
} from '../../services/questService';
import { getTimerSettings } from '../../services/settingsService';
import { Button } from '../../ui/components/Button';
import { EmptyState } from '../../ui/components/EmptyState';
import { FilterChips } from '../../ui/components/FilterChips';
import { HabitBadge } from '../../ui/components/HabitBadge';
import { Panel } from '../../ui/components/Panel';
import { QuestCard } from '../../ui/components/QuestCard';
import { QuestGroup, QuestRow } from '../../ui/components/QuestRow';
import { SegmentedControl } from '../../ui/components/SegmentedControl';
import { TabScene } from '../../ui/components/TabScene';
import { border, colors, panelAlpha, space, type } from '../../ui/theme/tokens';

type QuestTab = 'today' | 'all';
/** Daily quests (habits) versus ephemeral ones (one-off tasks). */
type KindFilter = 'all' | 'habits' | 'tasks';

const KIND_OPTIONS = [
  { value: 'all', label: en.quests.filter.all },
  { value: 'habits', label: en.quests.filter.habits },
  { value: 'tasks', label: en.quests.filter.tasks },
] as const;

const rowKey = (row: QuestRowModel) => (row.kind === 'task' ? row.task.id : row.occurrence.id);

function habitDays(habit: Habit): string {
  const days = weekdaysFromMask(habit.weekdaysMask);
  if (days.length === 7) return en.quests.everyDay;
  return days.map((day) => en.weekdays.short[day - 1] ?? '').join(' · ');
}

export default function QuestsScreen() {
  const db = useDb();
  const router = useRouter();
  const today = useToday();
  const [tab, setTab] = useState<QuestTab>('today');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const showTasks = kindFilter !== 'habits';
  const showHabits = kindFilter !== 'tasks';

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
  const categories = useQuery(['categories'], listCategories).data;
  const focusMin = useQuery(['settings'], getTimerSettings).data?.defaultFocusMin;

  const view = useMemo(() => {
    if (!data) return null;
    return questsForDate(data.today, data.today, data.tasks, data.habits, data.occurrences, data.mission);
  }, [data]);

  const allOpenTasks = useMemo(() => data?.tasks.filter((task) => task.status === 'open') ?? [], [data]);
  const activeHabits = useMemo(() => data?.habits.filter((habit) => habit.status === 'active') ?? [], [data]);

  const schedule = (habit: Habit): HabitSchedule => ({
    weekdaysMask: habit.weekdaysMask,
    startLocalDate: habit.startLocalDate,
    archivedLocalDate: habit.archivedLocalDate,
    status: habit.status,
  });

  const categoryName = (categoryId: string | null) =>
    categories?.find((category) => category.id === categoryId)?.name ?? en.focus.prepare.uncategorized;

  const start = (row: QuestRowModel) =>
    router.push(
      (row.kind === 'task'
        ? `/focus?taskId=${encodeURIComponent(row.task.id)}`
        : `/focus?occurrenceId=${encodeURIComponent(row.occurrence.id)}`) as Href,
    );
  const open = (row: QuestRowModel) =>
    router.push(
      row.kind === 'task'
        ? { pathname: '/quest/task/[id]', params: { id: row.task.id } }
        : { pathname: '/quest/habit/[id]', params: { id: row.habit.id } },
    );
  const toggle = (row: QuestRowModel) =>
    row.kind === 'task'
      ? toggleTaskComplete(db, systemClock, row.task.id, today)
      : toggleOccurrenceComplete(db, systemClock, row.occurrence.id);
  const makeMission = (row: QuestRowModel) =>
    void setPriorityMission(
      db,
      systemClock,
      row.kind === 'task' ? { kind: 'task', id: row.task.id } : { kind: 'habit', id: row.habit.id },
    );

  const info = (row: QuestRowModel): { text?: string; tone?: 'warning' } => {
    if (row.kind === 'task') return row.overdue ? { text: en.quests.overdue, tone: 'warning' } : {};
    if (!data) return {};
    const progress = habitWeekProgress(
      schedule(row.habit),
      data.weekOccurrences.filter((occurrence) => occurrence.habitId === row.habit.id),
      today,
    );
    return { text: en.quests.weekProgress(progress.done, progress.planned) };
  };

  const renderRows = (rows: QuestRowModel[]) =>
    rows.map((row, index) => {
      const extra = info(row);
      return (
        <QuestRow
          key={rowKey(row)}
          row={row}
          info={extra.text}
          infoTone={extra.tone}
          separated={index > 0}
          onToggleComplete={() => toggle(row)}
          onStart={() => start(row)}
          onOpen={() => open(row)}
          onLongPress={() => makeMission(row)}
        />
      );
    });

  const missionKey = view?.mission ? rowKey(view.mission) : null;
  const todayRows = view ? [...view.active, ...view.completed].filter((row) => rowKey(row) !== missionKey) : [];
  const todayTasks = todayRows.filter((row) => row.kind === 'task');
  const todayHabits = todayRows.filter((row) => row.kind === 'habit');
  const mission = view?.mission ?? null;
  const missionVisible =
    mission !== null && (kindFilter === 'all' || (kindFilter === 'habits') === (mission.kind === 'habit'));

  return (
    <TabScene>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel alpha={panelAlpha.quests} style={styles.card}>
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
          <FilterChips
            options={KIND_OPTIONS}
            value={kindFilter}
            onChange={setKindFilter}
            accessibilityLabel={en.quests.filter.a11y}
          />

          {tab === 'today' && view ? (
            todayRows.length === 0 && !mission ? (
              <EmptyState
                message={en.quests.emptyToday}
                actionLabel={en.quests.addQuest}
                onAction={() => router.push('/quest/new' as Href)}
              />
            ) : (
              <>
                {kindFilter === 'all' || missionVisible ? (
                <Section title={en.quests.priorityMission}>
                  {mission && missionVisible ? (
                    <QuestCard
                        leading={
                          mission.kind === 'habit' ? (
                            <HabitBadge icon={mission.habit.icon} color={mission.habit.color} size={40} />
                          ) : undefined
                        }
                        onPress={() => open(mission)}
                        title={mission.kind === 'task' ? mission.task.title : mission.habit.title}
                        subtitle={categoryName(mission.kind === 'task' ? mission.task.categoryId : mission.habit.categoryId)}
                        right={
                          <Pressable
                            onPress={() => start(mission)}
                            hitSlop={8}
                            style={styles.missionStart}
                            accessibilityRole="button"
                            accessibilityLabel={en.quests.start}
                          >
                            <MaterialCommunityIcons name="play-circle-outline" size={34} color={colors.actionBright} />
                            {focusMin ? <Text style={styles.missionMin}>{en.onboarding.minutes(focusMin)}</Text> : null}
                          </Pressable>
                        }
                      />
                  ) : (
                    <Text style={styles.hint}>{en.quests.missionHint}</Text>
                  )}
                </Section>
                ) : null}

                {showTasks ? (
                  <Section title={en.quests.tasks}>
                    {todayTasks.length > 0 ? (
                      <QuestGroup>{renderRows(todayTasks)}</QuestGroup>
                    ) : (
                      <Text style={styles.hint}>{en.quests.noTasks}</Text>
                    )}
                  </Section>
                ) : null}

                {showHabits ? (
                  <Section title={en.quests.habits}>
                    {todayHabits.length > 0 ? (
                      <QuestGroup>{renderRows(todayHabits)}</QuestGroup>
                    ) : (
                      <Text style={styles.hint}>{en.quests.noHabits}</Text>
                    )}
                  </Section>
                ) : null}
              </>
            )
          ) : null}

          {tab === 'all' ? (
            <>
              {showTasks ? (
                <Section title={en.quests.tasks}>
                  {allOpenTasks.length > 0 ? (
                    <QuestGroup>
                      {renderRows(allOpenTasks.map((task) => ({ kind: 'task', task, overdue: false })))}
                    </QuestGroup>
                  ) : (
                    <Text style={styles.hint}>{en.quests.noTasks}</Text>
                  )}
                </Section>
              ) : null}
              {showHabits ? (
                <Section title={en.quests.habits}>
                  {activeHabits.length > 0 ? (
                    <QuestGroup>
                      {activeHabits.map((habit, index) => (
                        <Pressable
                          key={habit.id}
                          onPress={() => router.push({ pathname: '/quest/habit/[id]', params: { id: habit.id } })}
                          style={({ pressed }) => [styles.habitRow, index > 0 && styles.separated, pressed && styles.pressed]}
                          accessibilityRole="button"
                          accessibilityLabel={habit.title}
                        >
                          <HabitBadge icon={habit.icon} color={habit.color} size={28} />
                          <Text style={styles.habitTitle} numberOfLines={1}>
                            {habit.title}
                          </Text>
                          <Text style={styles.habitDays} numberOfLines={1}>
                            {habitDays(habit)}
                          </Text>
                          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
                        </Pressable>
                      ))}
                    </QuestGroup>
                  ) : (
                    <Text style={styles.hint}>{en.quests.noHabits}</Text>
                  )}
                </Section>
              ) : null}
            </>
          ) : null}

          <Button label={en.quests.addQuest} icon="plus" large onPress={() => router.push('/quest/new' as Href)} />
        </Panel>
      </ScrollView>
    </TabScene>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingVertical: space.sm },
  card: { gap: space.lg },
  title: { ...type.title, color: colors.text },
  section: { gap: space.sm },
  sectionTitle: { ...type.h2, fontWeight: '700', color: colors.text },
  hint: { ...type.label, fontWeight: '400', color: colors.textMuted },
  missionStart: { alignItems: 'center', gap: 2 },
  missionMin: { ...type.caption, color: colors.textMuted },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.md },
  separated: { borderTopWidth: border.thin, borderTopColor: colors.cellBorder },
  pressed: { backgroundColor: 'rgba(47,123,255,0.08)' },
  habitTitle: { ...type.body, color: colors.text, flex: 1 },
  habitDays: { ...type.label, fontWeight: '400', color: colors.textMuted },
});
