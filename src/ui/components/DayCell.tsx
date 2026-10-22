import { Pressable, StyleSheet, Text, View } from 'react-native';

import { scoreBucket, scoreDisplay, type DayCellState } from '../../domain/scores';
import { en, formatDayLong } from '../../i18n/en';
import { border, colors, radius, space, touch, type } from '../theme/tokens';

interface Props {
  date: string;
  /** Short weekday ("Mon"). */
  weekday: string;
  state: DayCellState;
  selected: boolean;
  isToday: boolean;
  onPress: () => void;
}

/** What the cell says in words (the color is never the only signal). */
export function dayCellStateText(state: DayCellState): string {
  const cell = en.home.calendar;
  switch (state.kind) {
    case 'today':
      return cell.stateInProgress(scoreDisplay(state.score));
    case 'past':
      return cell.stateScore(scoreDisplay(state.score));
    case 'future':
      return cell.stateFuture;
    case 'rest':
      return cell.stateRest;
    case 'noGoal':
      return cell.stateNoGoal;
  }
}

function mainText(state: DayCellState): string {
  switch (state.kind) {
    case 'today':
    case 'past':
      return String(scoreDisplay(state.score));
    case 'rest':
      return en.home.calendar.rest;
    case 'noGoal':
      return en.home.calendar.noGoal;
    case 'future':
      return '';
  }
}

function accentColor(state: DayCellState): string {
  if (state.kind === 'today' || state.kind === 'past') return colors.score[scoreBucket(state.score)];
  return colors.score.neutral;
}

export function DayCell({ date, weekday, state, selected, isToday, onPress }: Props) {
  const accent = accentColor(state);
  const hasScore = state.kind === 'today' || state.kind === 'past';
  const label = `${formatDayLong(date)}, ${dayCellStateText(state)}${selected ? `, ${en.home.calendar.selected}` : ''}`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.cell, selected && styles.selected]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={styles.weekday} maxFontSizeMultiplier={1.3}>
        {weekday}
      </Text>
      <Text style={[styles.date, isToday && styles.dateToday]} maxFontSizeMultiplier={1.3}>
        {Number(date.slice(-2))}
      </Text>
      <View style={[styles.marker, isToday && styles.markerToday]} />
      <Text
        style={[styles.main, { color: hasScore ? accent : colors.textMuted }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {mainText(state)}
      </Text>
      <View style={[styles.accent, { backgroundColor: hasScore || state.kind !== 'future' ? accent : 'transparent' }]} />
      <Text style={styles.live} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {state.kind === 'today' ? en.home.calendar.inProgressShort : ' '}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minWidth: touch.min - space.sm,
    minHeight: 92,
    alignItems: 'center',
    paddingVertical: space.xs,
    borderWidth: border.thin,
    borderColor: 'transparent',
    borderRadius: radius.md,
    gap: 2,
  },
  selected: { borderColor: colors.borderStrong, backgroundColor: colors.actionMuted },
  weekday: { ...type.caption, color: colors.textMuted },
  date: { ...type.body, color: colors.text, fontVariant: ['tabular-nums'] },
  dateToday: { color: colors.actionBright, fontWeight: '700' },
  marker: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  markerToday: { backgroundColor: colors.actionBright },
  main: { ...type.label, fontVariant: ['tabular-nums'], minHeight: 17 },
  accent: { width: 20, height: 3, borderRadius: 2 },
  live: { fontSize: 10, lineHeight: 12, color: colors.textFaint },
});
