import { StyleSheet, Text, View } from 'react-native';

import { dayScore, scoreBucket } from '../../domain/scores';
import type { HistogramBar } from '../../domain/stats';
import { isoWeekday } from '../../domain/time/localDate';
import { en, formatDayLong, formatDuration } from '../../i18n/en';
import { colors, radius, space, type } from '../theme/tokens';

const CHART_HEIGHT = 120;
const SEC_PER_MIN = 60;
const WEEK_LENGTH = 7;
/** Month view: one label every N days so the axis stays readable on a 360 px screen. */
const MONTH_LABEL_STEP = 5;

function barColor(bar: HistogramBar): string {
  if (bar.focusSec === null || bar.focusSec === 0) return colors.score.neutral;
  if (bar.goalMin === null) return colors.actionBright;
  return colors.score[scoreBucket(dayScore(bar.focusSec, bar.goalMin))];
}

function labelOf(bar: HistogramBar, compact: boolean): string {
  const day = Number(bar.date.slice(-2));
  if (!compact) return en.weekdays.short[isoWeekday(bar.date) - 1] ?? '';
  return day === 1 || day % MONTH_LABEL_STEP === 0 ? String(day) : '';
}

function a11yOf(bar: HistogramBar): string {
  const day = formatDayLong(bar.date);
  if (bar.focusSec === null) return en.stats.histogram.futureA11y(day);
  const focus = formatDuration(bar.focusSec);
  if (bar.rest) return en.stats.histogram.restA11y(day, focus);
  return en.stats.histogram.barA11y(day, focus, bar.goalMin === null ? null : formatDuration(bar.goalMin * SEC_PER_MIN));
}

/**
 * One bar per day on a common scale; a thin tick marks the daily goal. Future days stay empty
 * (not "0"). Plain Views: no chart library, readable by screen readers through the labels.
 */
export function BarChart({ bars }: { bars: readonly HistogramBar[] }) {
  const compact = bars.length > WEEK_LENGTH;
  const scaleSec = Math.max(
    1,
    ...bars.map((bar) => bar.focusSec ?? 0),
    ...bars.map((bar) => (bar.goalMin ?? 0) * SEC_PER_MIN),
  );

  return (
    <View>
      <View style={styles.plot}>
        {bars.map((bar) => {
          const height = bar.focusSec ? Math.max(3, (bar.focusSec / scaleSec) * CHART_HEIGHT) : 0;
          const goalBottom = bar.goalMin === null ? null : ((bar.goalMin * SEC_PER_MIN) / scaleSec) * CHART_HEIGHT;
          return (
            <View key={bar.date} style={styles.column} accessible accessibilityLabel={a11yOf(bar)}>
              <View style={styles.baseline} />
              {height > 0 ? <View style={[styles.bar, { height, backgroundColor: barColor(bar) }]} /> : null}
              {goalBottom !== null ? <View style={[styles.goal, { bottom: goalBottom }]} /> : null}
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        {bars.map((bar) => (
          <Text key={bar.date} style={styles.axisLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {labelOf(bar, compact)}
          </Text>
        ))}
      </View>
      <Text style={styles.legend}>{en.stats.histogram.legend}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { height: CHART_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  column: { flex: 1, height: CHART_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' },
  baseline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: colors.divider },
  bar: { width: '70%', maxWidth: 28, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  goal: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.textFaint, opacity: 0.8 },
  axis: { flexDirection: 'row', gap: 2, marginTop: space.xs },
  axisLabel: { flex: 1, textAlign: 'center', ...type.caption, fontSize: 10, color: colors.textMuted, overflow: 'visible' },
  legend: { ...type.caption, color: colors.textFaint, marginTop: space.xs },
});
