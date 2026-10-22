import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart as GiftedBarChart, type barDataItem } from 'react-native-gifted-charts';

import { dayScore, scoreBucket, scoreDisplay } from '../../domain/scores';
import type { HistogramBar } from '../../domain/stats';
import { isoWeekday } from '../../domain/time/localDate';
import type { LocalDate } from '../../domain/types';
import { en, formatDayLong, formatDuration, formatDurationCompact } from '../../i18n/en';
import { colors, type } from '../theme/tokens';

const PLOT_HEIGHT = 150;
const Y_LABEL_WIDTH = 36;
const SEC_PER_MIN = 60;
const MIN_PER_HOUR = 60;
const WEEK_LENGTH = 7;
/** Month view: one x label every N days so the axis stays readable on a 360 px screen. */
const MONTH_LABEL_STEP = 5;
const MONTH_LABEL_WIDTH = 24;

/** Axis step (minutes) and number of sections so that the top of the axis is just above the tallest bar. */
function axisOf(maxMin: number): { step: number; sections: number } {
  const step = maxMin <= MIN_PER_HOUR ? 30 : maxMin <= 4 * MIN_PER_HOUR ? MIN_PER_HOUR : 2 * MIN_PER_HOUR;
  return { step, sections: Math.max(1, Math.ceil(maxMin / step)) };
}

function a11yOf(bar: HistogramBar): string {
  const day = formatDayLong(bar.date);
  if (bar.focusSec === null) return en.stats.histogram.futureA11y(day);
  const focus = formatDuration(bar.focusSec);
  if (bar.rest) return en.stats.histogram.restA11y(day, focus);
  return en.stats.histogram.barA11y(day, focus, bar.goalMin === null ? null : formatDuration(bar.goalMin * SEC_PER_MIN));
}

/** Score under the weekday (week view): only for days that have a goal and are not in the future. */
function ScoreText({ bar }: { bar: HistogramBar }) {
  if (bar.focusSec === null || (bar.goalMin === null && !bar.rest)) return <Text style={styles.score}> </Text>;
  if (bar.rest) return <Text style={[styles.score, styles.scoreRest]}>{en.home.calendar.rest}</Text>;
  const score = dayScore(bar.focusSec, bar.goalMin ?? 0);
  return <Text style={[styles.score, { color: colors.score[scoreBucket(score)] }]}>{scoreDisplay(score)}</Text>;
}

interface Props {
  bars: readonly HistogramBar[];
  today: LocalDate;
}

/**
 * Per-day histogram (react-native-gifted-charts): one blue bar per day, value above the bar, a
 * brighter outlined bar for today, weekday + score below in the week view. Future days stay empty.
 */
export function BarChart({ bars, today }: Props) {
  const [width, setWidth] = useState(0);
  const compact = bars.length > WEEK_LENGTH;

  const maxMin = Math.max(0, ...bars.map((bar) => (bar.focusSec ?? 0) / SEC_PER_MIN));
  const { step, sections } = axisOf(maxMin);
  const yLabels = Array.from({ length: sections + 1 }, (_, index) =>
    index === 0 ? '0' : formatDurationCompact(index * step * SEC_PER_MIN),
  );

  const slot = width > 0 ? (width - Y_LABEL_WIDTH) / bars.length : 0;
  const barWidth = compact ? Math.max(4, slot * 0.6) : Math.min(30, slot * 0.62);
  const spacing = Math.max(0, slot - barWidth);

  const data: barDataItem[] = bars.map((bar) => {
    const isToday = bar.date === today;
    const weekday = en.weekdays.short[isoWeekday(bar.date) - 1] ?? '';
    const dayNumber = Number(bar.date.slice(-2));
    const showMonthLabel = dayNumber === 1 || dayNumber % MONTH_LABEL_STEP === 0;
    return {
      value: (bar.focusSec ?? 0) / SEC_PER_MIN,
      frontColor: isToday ? colors.barBright : colors.bar,
      gradientColor: isToday ? colors.cyan : colors.barBright,
      barStyle: isToday ? { borderWidth: 1, borderColor: colors.cyan } : undefined,
      topLabelComponent:
        !compact && bar.focusSec ? () => <Text style={styles.value}>{formatDurationCompact(bar.focusSec ?? 0)}</Text> : undefined,
      labelComponent: () =>
        compact ? (
          // Wider than a 9 px bar, centered on it, so two-digit days never wrap.
          <View style={[styles.monthLabel, { marginHorizontal: (barWidth - MONTH_LABEL_WIDTH) / 2 }]}>
            <Text style={styles.axis} numberOfLines={1}>
              {showMonthLabel ? dayNumber : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.labelBox}>
            <Text style={[styles.axis, isToday && styles.axisToday]}>{weekday.slice(0, 1)}</Text>
            <ScoreText bar={bar} />
          </View>
        ),
    };
  });

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={bars.map(a11yOf).join('. ')}
    >
      {width > 0 ? (
        <GiftedBarChart
          data={data}
          width={width - Y_LABEL_WIDTH}
          height={PLOT_HEIGHT}
          barWidth={barWidth}
          spacing={spacing}
          initialSpacing={spacing / 2}
          endSpacing={0}
          disableScroll
          isAnimated={false}
          noOfSections={sections}
          maxValue={sections * step}
          yAxisLabelTexts={yLabels}
          yAxisLabelWidth={Y_LABEL_WIDTH}
          yAxisTextStyle={styles.yText}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={colors.cellBorder}
          rulesColor="rgba(120,170,255,0.14)"
          rulesType="solid"
          showGradient
          barBorderTopLeftRadius={5}
          barBorderTopRightRadius={5}
          labelsExtraHeight={compact ? 0 : 18}
          xAxisLabelsVerticalShift={0}
        />
      ) : (
        <View style={{ height: PLOT_HEIGHT }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  yText: { ...type.caption, fontSize: 11, color: colors.textMuted },
  value: { ...type.caption, fontSize: 10, color: colors.text, marginBottom: 2 },
  axis: { ...type.caption, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  axisToday: { color: colors.cyan, fontWeight: '700' },
  labelBox: { alignItems: 'center', gap: 1, minWidth: 28 },
  monthLabel: { width: MONTH_LABEL_WIDTH, alignItems: 'center' },
  score: { fontSize: 10, lineHeight: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  scoreRest: { color: colors.textFaint, fontWeight: '400' },
});
