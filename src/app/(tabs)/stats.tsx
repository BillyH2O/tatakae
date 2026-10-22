import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import {
  hasAnyFocus,
  isCurrentPeriod,
  parsePeriod,
  parseScope,
  periodRange,
  shiftAnchor,
  type StatsPeriod,
  type StatsScope,
} from '../../domain/stats';
import { asLocalDate } from '../../domain/time/localDate';
import { useHabitRegularity, useHeatmap, useSessionHistory, useStatsView, type StatsView } from '../../hooks/useStats';
import { useToday } from '../../hooks/useToday';
import { en, formatDuration, formatMonthYear, formatWeekRange } from '../../i18n/en';
import { BarChart } from '../../ui/components/BarChart';
import { Button } from '../../ui/components/Button';
import { CategoryBars } from '../../ui/components/CategoryBars';
import { FilterChips } from '../../ui/components/FilterChips';
import { HabitRegularityCard } from '../../ui/components/HabitRegularityCard';
import { Heatmap } from '../../ui/components/Heatmap';
import { Panel } from '../../ui/components/Panel';
import { ProgressBar } from '../../ui/components/ProgressBar';
import { SegmentedControl } from '../../ui/components/SegmentedControl';
import { LastSessionCard } from '../../ui/components/SessionRow';
import { StatTile } from '../../ui/components/StatTile';
import { TabScene } from '../../ui/components/TabScene';
import { colors, panelAlpha, space, touch, type } from '../../ui/theme/tokens';

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;
const SEC_PER_MIN = 60;
const PERIOD_OPTIONS = [
  { value: 'week', label: en.stats.periodTabs.week },
  { value: 'month', label: en.stats.periodTabs.month },
] as const;
const SCOPE_OPTIONS = [
  { value: 'all', label: en.stats.scope.all },
  { value: 'habits', label: en.stats.scope.habits },
  { value: 'other', label: en.stats.scope.other },
] as const;

/** Statistics: one card holding quiet cells (as on the reference mockup), blue only, cyan for figures. */
export default function StatsScreen() {
  const router = useRouter();
  const today = useToday();
  const params = useLocalSearchParams<{ period?: string; anchor?: string; scope?: string }>();
  const period = parsePeriod(params.period);
  const scope = parseScope(params.scope);
  const anchor = params.anchor && DATE_PARAM.test(params.anchor) ? asLocalDate(params.anchor) : today;

  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);
  const view = useStatsView(range, today, scope);
  const heatmap = useHeatmap(today);
  const habitViews = useHabitRegularity(today);
  const lastSession = useSessionHistory(1, scope)?.items[0];

  const go = (nextPeriod: StatsPeriod, nextAnchor: string) =>
    router.setParams({ period: nextPeriod, anchor: nextAnchor, scope });
  const setScope = (next: StatsScope) => router.setParams({ scope: next });
  const isCurrent = isCurrentPeriod(range, today);
  const label = period === 'month' ? formatMonthYear(range.from) : formatWeekRange(range.from, range.to);

  return (
    <TabScene>
      <ScrollView contentContainerStyle={styles.content}>
        <Panel alpha={panelAlpha.solid} style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {en.stats.title}
          </Text>

          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(next) => go(next, today)}
            accessibilityLabel={en.stats.periodA11y}
          />

          <FilterChips options={SCOPE_OPTIONS} value={scope} onChange={setScope} accessibilityLabel={en.stats.scope.a11y} />
          {scope === 'all' ? null : <Text style={styles.caption}>{en.stats.scope.hint[scope]}</Text>}

          <Panel variant="cell" style={styles.nav}>
            <NavButton icon="chevron-left" label={en.stats.previous} onPress={() => go(period, shiftAnchor(period, anchor, -1))} />
            <View style={styles.navLabel}>
              <Text style={styles.range} accessibilityRole="header" numberOfLines={1}>
                {label}
              </Text>
              {isCurrent ? null : (
                <Text style={styles.link} onPress={() => go(period, today)} accessibilityRole="link">
                  {en.stats.thisPeriod[period]}
                </Text>
              )}
            </View>
            <NavButton
              icon="chevron-right"
              label={en.stats.next}
              disabled={isCurrent}
              onPress={() => go(period, shiftAnchor(period, anchor, 1))}
            />
          </Panel>

          {view === undefined ? (
            <Text style={styles.caption}>{en.stats.loading}</Text>
          ) : (
            <View style={styles.tiles}>
              <StatTile label={en.stats.tiles.total} value={formatDuration(view.kpis.focusSec)} />
              <StatTile label={en.stats.tiles.sessions} value={String(view.kpis.sessionCount)} />
              <StatTile
                label={en.stats.tiles.average}
                value={view.kpis.avgSessionSec === null ? en.stats.tiles.none : formatDuration(view.kpis.avgSessionSec)}
              />
            </View>
          )}

          {view === undefined ? null : (
            <Panel variant="cell" style={styles.cell}>
              <BarChart bars={view.bars} today={today} />
              {hasAnyFocus(view.bars) ? null : <Text style={styles.empty}>{en.stats.histogram.empty}</Text>}
            </Panel>
          )}

          {view === undefined || scope !== 'all' ? null : <WeeklyGoal weeks={view.weeks} />}

          {view === undefined ? null : (
            <Panel variant="cell" style={styles.cell}>
              <Text style={styles.cellTitle} accessibilityRole="header">
                {en.stats.categories.title}
              </Text>
              {view.categories.length === 0 ? (
                <Text style={styles.empty}>{en.stats.categories.empty}</Text>
              ) : (
                <CategoryBars bars={view.categories} />
              )}
            </Panel>
          )}

          {scope === 'habits' ? (
            <Panel variant="cell" style={styles.cell}>
              <View style={styles.cellHead}>
                <Text style={styles.cellTitle} accessibilityRole="header">
                  {en.stats.habits.title}
                </Text>
                <Text style={styles.caption}>{en.stats.habits.subtitle(PRODUCT.stats.heatmapWeeks)}</Text>
              </View>
              {habitViews === undefined ? (
                <Text style={styles.caption}>{en.stats.loading}</Text>
              ) : habitViews.length === 0 ? (
                <Text style={styles.empty}>{en.stats.habits.empty}</Text>
              ) : (
                habitViews.map((habitView, index) => (
                  <View key={habitView.habit.id} style={index > 0 ? styles.habitDivided : undefined}>
                    <HabitRegularityCard
                      view={habitView}
                      today={today}
                      onPress={() => router.push({ pathname: '/quest/habit/[id]', params: { id: habitView.habit.id } })}
                    />
                  </View>
                ))
              )}
            </Panel>
          ) : null}

          {scope === 'all' && heatmap ? (
            <Panel variant="cell" style={styles.cell}>
              <View style={styles.cellHead}>
                <Text style={styles.cellTitle} accessibilityRole="header">
                  {en.stats.heatmap.title}
                </Text>
                <Text style={styles.caption}>{en.stats.heatmap.subtitle(PRODUCT.stats.heatmapWeeks)}</Text>
              </View>
              <Heatmap grid={heatmap} />
            </Panel>
          ) : null}

          <Panel variant="cell" style={styles.cell}>
            {lastSession ? (
              <LastSessionCard
                item={lastSession}
                onPress={() => router.push({ pathname: '/session/[id]/edit', params: { id: lastSession.id } })}
              />
            ) : (
              <Text style={styles.empty}>{en.stats.last.none}</Text>
            )}
          </Panel>

          <View style={styles.actions}>
            <Button label={en.stats.history.open} variant="ghost" onPress={() => router.push('/sessions')} />
            <Button label={en.stats.add} onPress={() => router.push('/session/new')} />
          </View>
        </Panel>
      </ScrollView>
    </TabScene>
  );
}

function WeeklyGoal({ weeks }: { weeks: StatsView['weeks'] }) {
  const single = weeks.length === 1 ? weeks[0] : undefined;
  const valueOf = (week: StatsView['weeks'][number]) =>
    week.goalMin === null
      ? en.stats.weekly.noGoal
      : en.stats.weekly.of(formatDuration(week.focusSec), formatDuration(week.goalMin * SEC_PER_MIN));

  return (
    <Panel variant="cell" style={styles.cell}>
      <View style={styles.weekLine}>
        <Text style={styles.cellTitle} accessibilityRole="header">
          {en.stats.weekly.title}
        </Text>
        {single ? <Text style={styles.value}>{valueOf(single)}</Text> : null}
      </View>
      {weeks.map((week) => {
        const weekLabel = formatWeekRange(week.from, week.to);
        const focus = formatDuration(week.focusSec);
        const goal = week.goalMin === null ? null : formatDuration(week.goalMin * SEC_PER_MIN);
        return (
          <View
            key={week.from}
            style={styles.weekRow}
            accessible
            accessibilityLabel={en.stats.weekly.a11y(weekLabel, focus, goal, week.percent)}
          >
            {single ? null : (
              <View style={styles.weekLine}>
                <Text style={styles.caption}>{weekLabel}</Text>
                <Text style={styles.value}>{valueOf(week)}</Text>
              </View>
            )}
            {week.percent === null ? null : (
              <>
                <ProgressBar progress={week.percent / 100} height={10} />
                <Text style={styles.percent}>{en.stats.weekly.percent(week.percent)}</Text>
              </>
            )}
          </View>
        );
      })}
    </Panel>
  );
}

function NavButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'chevron-left' | 'chevron-right';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.navButton, disabled && styles.navDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <MaterialCommunityIcons name={icon} size={24} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingBottom: space.md },
  card: { gap: space.md },
  title: { ...type.title, color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
  empty: { ...type.body, color: colors.textMuted },
  nav: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.xs, paddingHorizontal: space.xs },
  navLabel: { flex: 1, alignItems: 'center' },
  range: { ...type.h2, color: colors.text, textAlign: 'center' },
  link: { ...type.caption, color: colors.actionBright },
  navButton: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  navDisabled: { opacity: 0.3 },
  tiles: { flexDirection: 'row', gap: space.sm },
  cell: { gap: space.md },
  cellHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cellTitle: { ...type.h2, color: colors.text },
  weekLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  weekRow: { gap: 6 },
  value: { ...type.label, color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  percent: { ...type.caption, color: colors.textMuted, textAlign: 'right', fontVariant: ['tabular-nums'] },
  habitDivided: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: space.md },
  actions: { gap: space.sm },
});
