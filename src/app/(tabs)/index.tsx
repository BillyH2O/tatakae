import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import type { RadarAxisId } from '../../domain/radar';
import { questsForDate, type QuestRow as QuestRowModel } from '../../domain/quests';
import { addDays, weekStart } from '../../domain/time/localDate';
import type { LocalDate } from '../../domain/types';
import type { SqlDb } from '../../db/SqlDb';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useDb } from '../../hooks/useDb';
import { useCategoryBars, useDayCells, useRadar } from '../../hooks/useHome';
import { useQuery } from '../../hooks/useQuery';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { useToday } from '../../hooks/useToday';
import { en, formatDayShort } from '../../i18n/en';
import { systemClock } from '../../services/clock';
import { newId } from '../../services/ids';
import {
  clearPriorityMissionIfInvalid,
  ensureOccurrenceHorizon,
  loadQuestContext,
  toggleOccurrenceComplete,
  toggleTaskComplete,
} from '../../services/questService';
import { Button } from '../../ui/components/Button';
import { CategoryBars } from '../../ui/components/CategoryBars';
import { Panel } from '../../ui/components/Panel';
import { QuestGroup, QuestRow } from '../../ui/components/QuestRow';
import { RadarChart } from '../../ui/components/RadarChart';
import { RadarExplanation, RadarLegend } from '../../ui/components/RadarLegend';
import { TabScene } from '../../ui/components/TabScene';
import { WeekCalendar } from '../../ui/components/WeekCalendar';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

const questKey = (row: QuestRowModel) => (row.kind === 'task' ? row.task.id : row.occurrence.id);

export default function HomeScreen() {
  const db = useDb();
  const router = useRouter();
  const today = useToday();
  const { stacked, largeText } = useResponsiveLayout();
  const active = useActiveSession().data;

  // `null` = follow the real current day (so the selection moves on at midnight).
  const [selectedChoice, setSelectedChoice] = useState<LocalDate | null>(null);
  const [weekChoice, setWeekChoice] = useState<LocalDate | null>(null);
  const [radarAxis, setRadarAxis] = useState<RadarAxisId | null>(null);

  const selected = selectedChoice ?? today;
  const weekFrom = weekChoice ?? weekStart(selectedChoice ?? today);

  useEffect(() => {
    void ensureOccurrenceHorizon(db, systemClock, newId).then(() => clearPriorityMissionIfInvalid(db, systemClock));
  }, [db, today]);

  const cells = useDayCells(weekFrom, today);
  const radar = useRadar(today);
  const selectedAxis = radar?.find((axis) => axis.axis === radarAxis) ?? null;
  const bars = useCategoryBars(selected);

  const questFetcher = useCallback((conn: SqlDb) => loadQuestContext(conn, selected), [selected]);
  const questData = useQuery(['quests'], questFetcher).data;
  const quests = useMemo(
    () =>
      questData
        ? questsForDate(selected, today, questData.tasks, questData.habits, questData.occurrences, questData.mission)
        : null,
    [questData, selected, today],
  );

  const select = (date: LocalDate) => {
    setSelectedChoice(date === today ? null : date);
  };
  const shiftWeek = (direction: -1 | 1) => setWeekChoice(addDays(weekFrom, direction * 7));
  const goToToday = () => {
    setSelectedChoice(null);
    setWeekChoice(null);
  };

  const startQuest = (row: QuestRowModel) =>
    router.push(
      (row.kind === 'task'
        ? `/focus?taskId=${encodeURIComponent(row.task.id)}`
        : `/focus?occurrenceId=${encodeURIComponent(row.occurrence.id)}`) as Href,
    );
  const toggleQuest = (row: QuestRowModel) =>
    row.kind === 'task'
      ? toggleTaskComplete(db, systemClock, row.task.id, today)
      : toggleOccurrenceComplete(db, systemClock, row.occurrence.id);

  // Done quests stay in the list (checked), after the open ones, as on the mockups.
  const allRows = quests ? [...quests.active, ...quests.completed] : [];
  const homeRows = allRows.slice(0, PRODUCT.quests.homeListMax);
  const totalQuests = allRows.length;
  const topBars = bars?.slice(0, PRODUCT.categories.homeTopN) ?? [];
  const moreCategories = (bars?.length ?? 0) > PRODUCT.categories.homeTopN;

  const formPanel = (
    <Panel alpha={panelAlpha.home} style={[styles.panel, !stacked && styles.half]}>
      <Text style={styles.panelTitle} accessibilityRole="header">
        {en.home.form.title}
      </Text>
      <Text style={styles.caption}>{en.home.form.subtitle}</Text>
      {radar ? (
        <>
          <View style={[styles.formBody, largeText && styles.formBodyStacked]}>
            <RadarChart
              axes={radar}
              selected={radarAxis}
              onSelect={(axis) => setRadarAxis(radarAxis === axis ? null : axis)}
            />
            <View style={styles.legend}>
              <RadarLegend axes={radar} selected={radarAxis} onSelect={setRadarAxis} detailed={largeText} />
            </View>
          </View>
          {selectedAxis ? <RadarExplanation axis={selectedAxis} /> : null}
        </>
      ) : (
        <Text style={styles.caption}>…</Text>
      )}
    </Panel>
  );

  const categoryPanel = (
    <Panel alpha={panelAlpha.home} style={[styles.panel, !stacked && styles.half]}>
      <View style={styles.questsHeader}>
        <Text style={styles.panelTitle} accessibilityRole="header">
          {en.home.categories.title}
        </Text>
        {moreCategories ? (
          <Pressable
            onPress={() => router.push(`/categories?date=${selected}` as Href)}
            hitSlop={10}
            style={styles.seeAll}
            accessibilityRole="button"
          >
            <Text style={styles.seeAllText}>{en.home.categories.seeAll}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.actionBright} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.caption}>{formatDayShort(selected)}</Text>
      {bars === undefined ? (
        <Text style={styles.caption}>…</Text>
      ) : bars.length === 0 ? (
        <Text style={styles.empty}>{en.home.categories.empty}</Text>
      ) : (
        <CategoryBars bars={topBars} />
      )}
    </Panel>
  );

  return (
    <TabScene>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel alpha={panelAlpha.home} style={styles.calendarPanel}>
          <WeekCalendar
            weekFrom={weekFrom}
            today={today}
            selected={selected}
            cells={cells}
            onSelect={select}
            onShiftWeek={shiftWeek}
            onGoToToday={goToToday}
          />
        </Panel>

        {stacked ? (
          <>
            {formPanel}
            {categoryPanel}
          </>
        ) : (
          <View style={styles.sideBySide}>
            {formPanel}
            {categoryPanel}
          </View>
        )}

        <Panel alpha={panelAlpha.home} style={styles.panel}>
          <View style={styles.questsHeader}>
            <Text style={styles.panelTitle} accessibilityRole="header">
              {selected === today ? en.home.quests.todayTitle : en.home.quests.dayTitle(formatDayShort(selected))}
            </Text>
            <Pressable
              onPress={() => router.push('/quests' as Href)}
              hitSlop={10}
              style={styles.seeAll}
              accessibilityRole="button"
            >
              <Text style={styles.seeAllText}>
                {totalQuests > homeRows.length ? en.home.quests.seeAllCount(totalQuests) : en.home.quests.seeAll}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.actionBright} />
            </Pressable>
          </View>
          {quests && homeRows.length === 0 ? <Text style={styles.empty}>{en.home.quests.empty}</Text> : null}
          {homeRows.length > 0 ? (
            <QuestGroup>
              {homeRows.map((row, index) => (
                <QuestRow
                  key={questKey(row)}
                  row={row}
                  separated={index > 0}
                  onToggleComplete={() => toggleQuest(row)}
                  onStart={() => startQuest(row)}
                />
              ))}
            </QuestGroup>
          ) : null}
          <Button
            label={active ? en.home.resumeSession : en.home.startSession}
            icon="play"
            large
            onPress={() => router.push('/focus' as Href)}
            disabled={active === undefined}
          />
        </Panel>
      </ScrollView>
    </TabScene>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
  calendarPanel: { padding: space.sm },
  sideBySide: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  half: { flex: 1, minWidth: 0 },
  formBody: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  formBodyStacked: { flexDirection: 'column', alignItems: 'stretch' },
  legend: { flex: 1, minWidth: 0 },
  panel: { gap: space.sm },
  panelTitle: { ...type.h2, fontWeight: '700', color: colors.text, flexShrink: 1 },
  questsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  seeAll: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { ...type.label, color: colors.actionBright },
  caption: { ...type.caption, color: colors.textMuted },
  empty: { ...type.body, color: colors.textMuted },
});
