import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LocalDate } from '../../domain/types';
import { addDays } from '../../domain/time/localDate';
import type { DayCellData } from '../../hooks/useHome';
import { en, formatWeekRange } from '../../i18n/en';
import { colors, space, touch, type } from '../theme/tokens';
import { DayCell } from './DayCell';

interface Props {
  weekFrom: LocalDate;
  today: LocalDate;
  selected: LocalDate;
  /** Undefined while the week is loading. */
  cells: DayCellData[] | undefined;
  onSelect: (date: LocalDate) => void;
  onShiftWeek: (direction: -1 | 1) => void;
  /** Shown when another week than the current one is displayed. */
  onGoToToday: () => void;
}

/** Monday → Sunday strip: week navigation, one cell per day with its score or state. */
export function WeekCalendar({ weekFrom, today, selected, cells, onSelect, onShiftWeek, onGoToToday }: Props) {
  const range = formatWeekRange(weekFrom, addDays(weekFrom, 6));
  const isCurrentWeek = today >= weekFrom && today <= addDays(weekFrom, 6);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onShiftWeek(-1)}
          style={styles.arrow}
          accessibilityRole="button"
          accessibilityLabel={en.home.calendar.previousWeek}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.actionBright} />
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={styles.title} accessibilityRole="header" accessibilityLabel={en.home.calendar.weekA11y(range)}>
            {range}
          </Text>
          {isCurrentWeek ? null : (
            <Pressable onPress={onGoToToday} hitSlop={8} accessibilityRole="button">
              <Text style={styles.today}>{en.home.calendar.thisWeek}</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => onShiftWeek(1)}
          style={styles.arrow}
          accessibilityRole="button"
          accessibilityLabel={en.home.calendar.nextWeek}
        >
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.actionBright} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {(cells ?? placeholderCells(weekFrom)).map((cell, index) => (
          <DayCell
            key={cell.date}
            date={cell.date}
            weekday={en.weekdays.short[index] ?? ''}
            state={cell.state}
            selected={cell.date === selected}
            isToday={cell.date === today}
            onPress={() => onSelect(cell.date)}
          />
        ))}
      </View>
    </View>
  );
}

function placeholderCells(weekFrom: LocalDate): DayCellData[] {
  return Array.from({ length: 7 }, (_, index) => ({ date: addDays(weekFrom, index), state: { kind: 'future' as const } }));
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  titleBox: { flex: 1, alignItems: 'center' },
  title: { ...type.h2, color: colors.text, textAlign: 'center' },
  today: { ...type.caption, color: colors.actionBright, paddingVertical: 2 },
  row: { flexDirection: 'row', gap: 2 },
});
