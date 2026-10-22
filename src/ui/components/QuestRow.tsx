import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestRow as QuestRowModel } from '../../domain/quests';
import { en } from '../../i18n/en';
import { playCheckHaptic } from '../../services/feedback';
import { border, colors, space, touch, type } from '../theme/tokens';
import { HabitBadge } from './HabitBadge';

const BOX = 26;

interface Props {
  row: QuestRowModel;
  /** Short text on the right (habit progress, planned days, overdue…). */
  info?: string;
  infoTone?: 'muted' | 'warning';
  onToggleComplete: () => unknown;
  /** Starts a focus session on this quest; hidden once done. */
  onStart?: () => void;
  /** Opens the quest's detail screen (chevron). */
  onOpen?: () => void;
  onLongPress?: () => void;
  /** True for every row but the first of a group: draws the separator. */
  separated?: boolean;
}

export function isQuestRowDone(row: QuestRowModel): boolean {
  return row.kind === 'task' ? row.task.status === 'done' : row.occurrence.status === 'done';
}

/** Round checkbox: the fill pops in with a bounce, a ring ripples out and the check fades in. */
function CheckCircle({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const [fill] = useState(() => new Animated.Value(checked ? 1 : 0));
  const [ripple] = useState(() => new Animated.Value(1));
  const previous = useRef(checked);

  useEffect(() => {
    if (previous.current === checked) return;
    previous.current = checked;
    if (checked) {
      Animated.spring(fill, { toValue: 1, friction: 5, tension: 160, useNativeDriver: false }).start();
      ripple.setValue(0);
      Animated.timing(ripple, { toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    } else {
      Animated.timing(fill, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: false }).start();
    }
  }, [checked, fill, ripple]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={(touch.min - BOX) / 2}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={styles.box}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ripple,
          {
            opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.boxFill,
          {
            opacity: fill.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: 'clamp' }) }],
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: fill.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }),
            transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          }}
        >
          <MaterialCommunityIcons name="check-bold" size={16} color={colors.text} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** Title with a strike line that draws itself from left to right when the quest is done. */
function StrikeTitle({ title, done }: { title: string; done: boolean }) {
  const [strike] = useState(() => new Animated.Value(done ? 1 : 0));
  useEffect(() => {
    Animated.timing(strike, {
      toValue: done ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [done, strike]);

  return (
    <View style={styles.titleWrap}>
      <View style={styles.titleInner}>
        <Animated.Text
          style={[styles.title, { opacity: strike.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }]}
          numberOfLines={1}
        >
          {title}
        </Animated.Text>
        <Animated.View
          pointerEvents="none"
          style={[styles.strike, { width: strike.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
    </View>
  );
}

export function QuestRow({ row, info, infoTone = 'muted', onToggleComplete, onStart, onOpen, onLongPress, separated }: Props) {
  const done = isQuestRowDone(row);
  // Optimistic: the check animates on tap, before the write lands; the stored state wins afterwards.
  const [optimistic, setOptimistic] = useState<{ from: boolean; value: boolean } | null>(null);
  const shown = optimistic && optimistic.from === done ? optimistic.value : done;
  const title = row.kind === 'task' ? row.task.title : row.habit.title;

  const toggle = () => {
    if (!shown) playCheckHaptic();
    setOptimistic({ from: done, value: !shown });
    Promise.resolve(onToggleComplete()).catch(() => setOptimistic(null));
  };

  return (
    <View style={[styles.row, separated && styles.separated]}>
      <CheckCircle checked={shown} onPress={toggle} label={`${title}: ${shown ? en.quests.reopen : en.quests.complete}`} />
      <Pressable
        onPress={onOpen}
        onLongPress={onLongPress}
        disabled={!onOpen && !onLongPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={onOpen ? title : undefined}
      >
        {row.kind === 'habit' ? <HabitBadge icon={row.habit.icon} color={row.habit.color} size={28} /> : null}
        <StrikeTitle title={title} done={shown} />
        {info ? (
          <Text style={[styles.info, infoTone === 'warning' && styles.warning]} numberOfLines={1}>
            {info}
          </Text>
        ) : null}
        {onOpen && !(onStart && !shown) ? (
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
        ) : null}
      </Pressable>
      {onStart && !shown ? (
        <Pressable onPress={onStart} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${en.quests.start}: ${title}`}>
          <MaterialCommunityIcons name="play-circle-outline" size={28} color={colors.actionBright} />
        </Pressable>
      ) : null}
    </View>
  );
}

export { ListGroup as QuestGroup } from './ListRow';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.md,
  },
  separated: { borderTopWidth: border.thin, borderTopColor: colors.cellBorder },
  body: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'stretch' },
  pressed: { opacity: 0.7 },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFill: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(76,155,255,0.7)',
  },
  ripple: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: BOX,
    height: BOX,
    borderRadius: BOX / 2,
    borderWidth: 2,
    borderColor: colors.actionBright,
  },
  titleWrap: { flexShrink: 1, flexGrow: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' },
  titleInner: { alignSelf: 'flex-start', maxWidth: '100%', justifyContent: 'center' },
  title: { ...type.body, color: colors.text },
  strike: {
    position: 'absolute',
    left: 0,
    height: 1.5,
    top: '50%',
    backgroundColor: colors.textMuted,
  },
  info: { ...type.label, color: colors.textMuted, fontWeight: '400', flexShrink: 0 },
  warning: { color: colors.warning },
});
