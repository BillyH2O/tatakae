import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goalProgress, type FocusVsGoal } from '../../domain/totals';
import { useDatabaseMode } from '../../hooks/useDatabaseMode';
import { useHeaderData } from '../../hooks/useHeaderData';
import { useToday } from '../../hooks/useToday';
import { en, formatDuration } from '../../i18n/en';
import { border, colors, glow, headerMaxFontScale, panel, radius, space, touch, type } from '../theme/tokens';
import { Avatar } from './Avatar';
import { ProgressBar } from './ProgressBar';

const AVATAR_SIZE = 40;
const HEADER_ALPHA = 0.86;

function focusLabel({ focusSec, goalMin }: FocusVsGoal): string {
  const focus = formatDuration(focusSec);
  return goalMin === null ? focus : en.header.focusOfGoal(focus, formatDuration(goalMin * 60));
}

function TotalColumn({ label, value, onPress }: { label: string; value: FocusVsGoal | undefined; onPress: () => void }) {
  const text = value ? focusLabel(value) : '…';
  const progress = value ? goalProgress(value) : null;
  return (
    <Pressable
      onPress={onPress}
      style={styles.total}
      hitSlop={{ top: space.sm, bottom: space.sm }}
      accessibilityRole="button"
      accessibilityLabel={en.header.openStatsA11y(label, text)}
    >
      <View style={styles.totalLine}>
        <Text style={styles.totalLabel} maxFontSizeMultiplier={headerMaxFontScale}>
          {label}
        </Text>
        <Text style={styles.totalValue} numberOfLines={1} maxFontSizeMultiplier={headerMaxFontScale}>
          {text}
        </Text>
      </View>
      {progress === null ? null : <ProgressBar progress={progress} />}
    </Pressable>
  );
}

/**
 * Compact header shown on every screen (PRODUCT_SPEC §5). Always reflects the real current day
 * and week, never the date selected elsewhere.
 */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const today = useToday();
  const data = useHeaderData(today);
  const { isDemo } = useDatabaseMode();

  const openStats = () => router.push({ pathname: '/stats', params: { period: 'week', anchor: today } });
  const level = data?.level;
  const crystals = data?.crystals;

  return (
    <View style={[styles.root, { marginTop: insets.top + space.sm }]}>
      <View style={styles.identity}>
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel={en.header.openProfile}
          hitSlop={(touch.min - AVATAR_SIZE) / 2}
        >
          <Avatar uri={data?.avatarUri ?? null} size={AVATAR_SIZE} />
        </Pressable>
        <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={headerMaxFontScale}>
          {data?.displayName ?? en.header.defaultName}
        </Text>
        <Text
          style={styles.level}
          maxFontSizeMultiplier={headerMaxFontScale}
          accessibilityLabel={level === undefined ? undefined : en.header.levelA11y(level)}
        >
          {level === undefined ? '…' : en.header.level(level)}
        </Text>
        <View
          style={styles.crystals}
          accessible
          accessibilityLabel={crystals === undefined ? undefined : en.header.crystalsA11y(crystals)}
        >
          <MaterialCommunityIcons name="diamond-stone" size={16} color={colors.crystal} />
          <Text style={styles.crystalValue} maxFontSizeMultiplier={headerMaxFontScale}>
            {crystals ?? '…'}
          </Text>
        </View>
      </View>
      <View style={styles.totals}>
        <TotalColumn label={en.header.today} value={data?.totals.today} onPress={openStats} />
        <View style={styles.divider} />
        <TotalColumn label={en.header.week} value={data?.totals.week} onPress={openStats} />
      </View>
      {isDemo ? (
        <Pressable
          onPress={() => router.push('/settings/data')}
          style={styles.demo}
          accessibilityRole="button"
          accessibilityLabel={en.demo.bannerA11y}
        >
          <Text style={styles.demoText} maxFontSizeMultiplier={headerMaxFontScale}>
            {en.demo.banner}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: space.md,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.sm,
    backgroundColor: panel(HEADER_ALPHA),
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.lg,
    boxShadow: glow,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { ...type.h2, color: colors.text, flex: 1, minWidth: 0 },
  level: { ...type.label, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  crystals: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  crystalValue: { ...type.label, color: colors.text, fontVariant: ['tabular-nums'] },
  totals: { flexDirection: 'row', alignItems: 'stretch', gap: space.md },
  total: { flex: 1, justifyContent: 'center', gap: space.xs, minHeight: 28 },
  totalLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  totalLabel: { ...type.caption, color: colors.textMuted },
  totalValue: { ...type.label, color: colors.text, fontVariant: ['tabular-nums'], flexShrink: 1 },
  divider: { width: border.hairline, backgroundColor: colors.divider },
  demo: {
    alignSelf: 'flex-start',
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    borderWidth: border.hairline,
    borderColor: colors.warning,
  },
  demoText: { ...type.caption, color: colors.warning },
});
