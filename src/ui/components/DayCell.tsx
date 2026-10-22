import { Pressable, StyleSheet, Text } from 'react-native';

import { scoreBucket, scoreDisplay, type DayCellState } from '../../domain/scores';
import { en, formatDayLong } from '../../i18n/en';
import { border, colors, glowStrong, radius, type } from '../theme/tokens';

interface Props {
  date: string;
  /** One-letter weekday ("M"). */
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
    case 'future':
      return en.home.calendar.noGoal;
  }
}

function scoreColor(state: DayCellState, highlighted: boolean): string {
  if (state.kind === 'today' || state.kind === 'past') {
    return highlighted ? colors.cyan : colors.score[scoreBucket(state.score)];
  }
  return colors.textMuted;
}

export function DayCell({ date, weekday, state, selected, isToday, onPress }: Props) {
  const label = `${formatDayLong(date)}, ${dayCellStateText(state)}${selected ? `, ${en.home.calendar.selected}` : ''}`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.cell, selected && styles.selected]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text style={[styles.weekday, selected && styles.textSelected]} maxFontSizeMultiplier={1.3}>
        {weekday}
      </Text>
      <Text style={[styles.date, (selected || isToday) && styles.textSelected]} maxFontSizeMultiplier={1.3}>
        {Number(date.slice(-2))}
      </Text>
      <Text
        style={[styles.main, state.kind === 'rest' && styles.rest, { color: scoreColor(state, selected) }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {mainText(state)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 6,
    borderWidth: border.thin,
    borderColor: colors.cellBorder,
    backgroundColor: colors.cell,
    borderRadius: radius.md,
  },
  selected: {
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(47,123,255,0.22)',
    boxShadow: glowStrong,
  },
  weekday: { ...type.caption, color: colors.textMuted },
  date: { ...type.body, color: colors.text, fontVariant: ['tabular-nums'] },
  textSelected: { color: colors.text, fontWeight: '700' },
  main: { ...type.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rest: { ...type.caption, lineHeight: 20, fontWeight: '500' },
});
