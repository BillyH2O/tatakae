import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PRODUCT } from '../../config/product';
import { hasAnyFocus, isCurrentPeriod, parsePeriod, periodRange, shiftAnchor, type StatsPeriod } from '../../domain/stats';
import { asLocalDate } from '../../domain/time/localDate';
import { useHeatmap, useSessionHistory, useStatsView } from '../../hooks/useStats';
import { useToday } from '../../hooks/useToday';
import { en, formatDuration, formatMonthYear, formatWeekRange } from '../../i18n/en';
import { BarChart } from '../../ui/components/BarChart';
import { Button } from '../../ui/components/Button';
import { CategoryBars } from '../../ui/components/CategoryBars';
import { Heatmap } from '../../ui/components/Heatmap';
import { Panel } from '../../ui/components/Panel';
import { ProgressBar } from '../../ui/components/ProgressBar';
import { SegmentedControl } from '../../ui/components/SegmentedControl';
import { SessionRow } from '../../ui/components/SessionRow';
import { StatTile } from '../../ui/components/StatTile';
import { TabScene } from '../../ui/components/TabScene';
import { colors, panelAlpha, space, touch, type } from '../../ui/theme/tokens';

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD_OPTIONS = [
  { value: 'week', label: en.stats.periodTabs.week },
  { value: 'month', label: en.stats.periodTabs.month },
] as const;

export default function StatsScreen() {
  const router = useRouter();
  const today = useToday();
  const params = useLocalSearchParams<{ period?: string; anchor?: string }>();
  const period = parsePeriod(params.period);
  const anchor = params.anchor && DATE_PARAM.test(params.anchor) ? asLocalDate(params.anchor) : today;

  const range = useMemo(() => periodRange(period, anchor), [period, anchor]);
  const view = useStatsView(range, today);
  const heatmap = useHeatmap(today);
  const lastSession = useSessionHistory(1)?.items[0];

  const go = (nextPeriod: StatsPeriod, nextAnchor: string) =>
    router.setParams({ period: nextPeriod, anchor: nextAnchor });
  const isCurrent = isCurrentPeriod(range, today);
  const label = period === 'month' ? formatMonthYear(range.from) : formatWeekRange(range.from, range.to);

  return (
    <TabScene>
      <ScrollView contentContainerStyle={styles.content}>
        <SegmentedControl
          options={PERIOD_OPTIONS}
          value={period}
          onChange={(next) => go(next, today)}
          accessibilityLabel={en.stats.periodA11y}
        />

        <View style={styles.nav}>
          <NavButton glyph="‹" label={en.stats.previous} onPress={() => go(period, shiftAnchor(period, anchor, -1))} />
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
            glyph="›"
            label={en.stats.next}
            disabled={isCurrent}
            onPress={() => go(period, shiftAnchor(period, anchor, 1))}
          />
        </View>

        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          {view === undefined ? (
            <Text style={styles.caption}>{en.stats.loading}</Text>
          ) : (
            <View style={styles.tiles}>
              <StatTile label={en.stats.tiles.total} value={formatDuration(view.kpis.focusSec)} />
              <View style={styles.tileDivider} />
              <StatTile label={en.stats.tiles.sessions} value={String(view.kpis.sessionCount)} />
              <View style={styles.tileDivider} />
              <StatTile
                label={en.stats.tiles.average}
                value={view.kpis.avgSessionSec === null ? en.stats.tiles.none : formatDuration(view.kpis.avgSessionSec)}
              />
            </View>
          )}
        </Panel>

        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {en.stats.histogram.title}
          </Text>
          {view === undefined ? null : (
            <>
              <BarChart bars={view.bars} />
              {hasAnyFocus(view.bars) ? null : <Text style={styles.body}>{en.stats.histogram.empty}</Text>}
            </>
          )}
        </Panel>

        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {en.stats.weekly.title}
          </Text>
          {view?.weeks.map((week) => {
            const weekLabel = formatWeekRange(week.from, week.to);
            const focus = formatDuration(week.focusSec);
            const goal = week.goalMin === null ? null : formatDuration(week.goalMin * 60);
            return (
              <View
                key={week.from}
                style={styles.weekRow}
                accessible
                accessibilityLabel={en.stats.weekly.a11y(weekLabel, focus, goal, week.percent)}
              >
                <View style={styles.weekLine}>
                  <Text style={styles.label}>{weekLabel}</Text>
                  <Text style={styles.value}>
                    {goal === null ? en.stats.weekly.noGoal : en.stats.weekly.of(focus, goal)}
                    {week.percent === null ? '' : `  ${en.stats.weekly.percent(week.percent)}`}
                  </Text>
                </View>
                {week.percent === null ? null : <ProgressBar progress={week.percent / 100} height={6} />}
              </View>
            );
          })}
        </Panel>

        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {en.stats.categories.title}
          </Text>
          {view === undefined ? null : view.categories.length === 0 ? (
            <Text style={styles.body}>{en.stats.categories.empty}</Text>
          ) : (
            <CategoryBars bars={view.categories} />
          )}
        </Panel>

        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {en.stats.heatmap.title}
          </Text>
          <Text style={styles.caption}>{en.stats.heatmap.subtitle(PRODUCT.stats.heatmapWeeks)}</Text>
          {heatmap ? <Heatmap grid={heatmap} /> : null}
        </Panel>

        <Panel alpha={panelAlpha.solid} style={styles.panel}>
          <Text style={styles.title} accessibilityRole="header">
            {en.stats.last.title}
          </Text>
          {lastSession ? (
            <SessionRow item={lastSession} onPress={() => router.push({ pathname: '/session/[id]/edit', params: { id: lastSession.id } })} />
          ) : (
            <Text style={styles.body}>{en.stats.last.none}</Text>
          )}
        </Panel>

        <View style={styles.actions}>
          <Button label={en.stats.history.open} variant="ghost" onPress={() => router.push('/sessions')} />
          <Button label={en.stats.add} onPress={() => router.push('/session/new')} />
        </View>
      </ScrollView>
    </TabScene>
  );
}

function NavButton({
  glyph,
  label,
  onPress,
  disabled,
}: {
  glyph: string;
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
      <Text style={styles.navGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  panel: { gap: space.md },
  title: { ...type.h2, color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
  body: { ...type.body, color: colors.textMuted },
  label: { ...type.label, color: colors.textMuted, flexShrink: 1 },
  value: { ...type.label, color: colors.text, fontVariant: ['tabular-nums'] },
  nav: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  navLabel: { flex: 1, alignItems: 'center', gap: 2 },
  range: { ...type.h2, color: colors.text, textAlign: 'center' },
  link: { ...type.caption, color: colors.actionBright },
  navButton: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  navDisabled: { opacity: 0.35 },
  navGlyph: { fontSize: 28, lineHeight: 32, color: colors.actionBright },
  tiles: { flexDirection: 'row', alignItems: 'center' },
  tileDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.divider },
  weekRow: { gap: space.xs },
  weekLine: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  actions: { gap: space.sm },
});
