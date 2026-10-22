import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { CollapsibleSection } from '../../ui/components/CollapsibleSection';
import { Panel } from '../../ui/components/Panel';
import { QuestRow } from '../../ui/components/QuestRow';
import { RadarChart } from '../../ui/components/RadarChart';
import { RadarLegend } from '../../ui/components/RadarLegend';
import { TabScene } from '../../ui/components/TabScene';
import { WeekCalendar } from '../../ui/components/WeekCalendar';
import { colors, panelAlpha, space, type } from '../../ui/theme/tokens';

const questKey = (row: QuestRowModel) => (row.kind === 'task' ? row.task.id : row.occurrence.id);

export default function HomeScreen() {
  const db = useDb();
  const router = useRouter();
  const today = useToday();
  const { stacked } = useResponsiveLayout();
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
      ? void toggleTaskComplete(db, systemClock, row.task.id, today)
      : void toggleOccurrenceComplete(db, systemClock, row.occurrence.id);

  const visibleQuests = quests?.active.slice(0, PRODUCT.quests.homeListMax) ?? [];
  const hiddenQuests = (quests?.active.length ?? 0) - visibleQuests.length;
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
          <RadarChart axes={radar} selected={radarAxis} onSelect={setRadarAxis} />
          <RadarLegend axes={radar} selected={radarAxis} onSelect={setRadarAxis} />
        </>
      ) : (
        <Text style={styles.caption}>…</Text>
      )}
    </Panel>
  );

  const categoryPanel = (
    <Panel alpha={panelAlpha.home} style={[styles.panel, !stacked && styles.half]}>
      <Text style={styles.panelTitle} accessibilityRole="header">
        {en.home.categories.title}
      </Text>
      <Text style={styles.caption}>{formatDayShort(selected)}</Text>
      {bars === undefined ? (
        <Text style={styles.caption}>…</Text>
      ) : bars.length === 0 ? (
        <Text style={styles.empty}>{en.home.categories.empty}</Text>
      ) : (
        <CategoryBars bars={topBars} />
      )}
      {moreCategories ? (
        <Button
          label={en.home.categories.seeAll}
          variant="ghost"
          onPress={() => router.push(`/categories?date=${selected}` as Href)}
        />
      ) : null}
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
          <Text style={styles.panelTitle} accessibilityRole="header">
            {selected === today ? en.home.quests.todayTitle : en.home.quests.dayTitle(formatDayShort(selected))}
          </Text>
          {quests && visibleQuests.length === 0 && quests.completed.length === 0 ? (
            <Text style={styles.empty}>{en.home.quests.empty}</Text>
          ) : null}
          {visibleQuests.map((row) => (
            <QuestRow
              key={questKey(row)}
              row={row}
              onToggleComplete={() => toggleQuest(row)}
              onStart={() => startQuest(row)}
            />
          ))}
          {quests && quests.completed.length > 0 ? (
            <CollapsibleSection title={en.quests.completed} count={quests.completed.length}>
              {quests.completed.map((row) => (
                <QuestRow
                  key={questKey(row)}
                  row={row}
                  onToggleComplete={() => toggleQuest(row)}
                  onStart={() => startQuest(row)}
                />
              ))}
            </CollapsibleSection>
          ) : null}
          <Button
            label={hiddenQuests > 0 ? `${en.home.quests.seeAll} (+${hiddenQuests})` : en.home.quests.seeAll}
            variant="ghost"
            onPress={() => router.push('/quests' as Href)}
          />
        </Panel>

        <Button
          label={active ? en.home.resumeSession : en.home.startSession}
          onPress={() => router.push('/focus' as Href)}
          disabled={active === undefined}
        />
      </ScrollView>
    </TabScene>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  calendarPanel: { paddingHorizontal: space.sm },
  sideBySide: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  half: { flex: 1, minWidth: 0 },
  panel: { gap: space.sm },
  panelTitle: { ...type.h2, color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
  empty: { ...type.body, color: colors.textMuted },
});
