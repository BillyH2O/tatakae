import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goalProgress, type FocusVsGoal } from '../../domain/totals';
import { useDatabaseMode } from '../../hooks/useDatabaseMode';
import { useHeaderData } from '../../hooks/useHeaderData';
import { useToday } from '../../hooks/useToday';
import { en, formatDuration } from '../../i18n/en';
import { border, colors, glow, headerMaxFontScale, panel, radius, space, type } from '../theme/tokens';
import { Avatar } from './Avatar';
import { ProgressBar } from './ProgressBar';

const AVATAR_SIZE = 52;
const HEADER_ALPHA = 0.86;

function focusLabel({ focusSec, goalMin }: FocusVsGoal): string {
  const focus = formatDuration(focusSec);
  return goalMin === null ? focus : en.header.focusOfGoal(focus, formatDuration(goalMin * 60));
}

function TotalColumn({ label, value, onPress }: { label: string; value: FocusVsGoal | undefined; onPress: () => void }) {
  const progress = value ? goalProgress(value) : null;
  return (
    <Pressable
      onPress={onPress}
      style={styles.total}
      hitSlop={{ top: space.sm, bottom: space.sm }}
      accessibilityRole="button"
      accessibilityLabel={en.header.openStatsA11y(label, value ? focusLabel(value) : '…')}
    >
      <View style={styles.totalLine}>
        <Text style={styles.totalLabel} maxFontSizeMultiplier={headerMaxFontScale}>
          {label}
        </Text>
        <Text style={styles.totalValue} numberOfLines={1} maxFontSizeMultiplier={headerMaxFontScale}>
          {value ? formatDuration(value.focusSec) : '…'}
          {value && value.goalMin !== null ? (
            <Text style={styles.totalGoal}>{` / ${formatDuration(value.goalMin * 60)}`}</Text>
          ) : null}
        </Text>
      </View>
      <ProgressBar progress={progress ?? 0} height={6} />
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
      <Pressable
        onPress={() => router.push('/profile')}
        style={styles.avatar}
        accessibilityRole="button"
        accessibilityLabel={en.header.openProfile}
      >
        <Avatar uri={data?.avatarUri ?? null} size={AVATAR_SIZE - 2} />
      </Pressable>
      <View style={styles.main}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={headerMaxFontScale}>
            {(data?.displayName ?? en.header.defaultName).toUpperCase()}
          </Text>
          <Text
            style={styles.level}
            maxFontSizeMultiplier={headerMaxFontScale}
            accessibilityLabel={level === undefined ? undefined : en.header.levelA11y(level)}
          >
            {level === undefined ? '' : `·  ${en.header.level(level)}`}
          </Text>
          <View style={styles.spacer} />
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
          <View
            style={styles.crystals}
            accessible
            accessibilityLabel={crystals === undefined ? undefined : en.header.crystalsA11y(crystals)}
          >
            <MaterialCommunityIcons name="diamond-stone" size={18} color={colors.crystal} />
            <Text style={styles.crystalValue} maxFontSizeMultiplier={headerMaxFontScale}>
              {crystals ?? '…'}
            </Text>
          </View>
        </View>
        <View style={styles.totals}>
          <TotalColumn label={en.header.today} value={data?.totals.today} onPress={openStats} />
          <TotalColumn label={en.header.week} value={data?.totals.week} onPress={openStats} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.md,
    marginBottom: space.sm,
    padding: space.sm + 2,
    backgroundColor: panel(HEADER_ALPHA),
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.lg,
    boxShadow: glow,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.md,
    borderWidth: border.thin,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.nightRaised,
  },
  main: { flex: 1, minWidth: 0, gap: 6 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { ...type.body, fontWeight: '700', letterSpacing: 0.5, color: colors.text, flexShrink: 1 },
  level: { ...type.body, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  spacer: { flex: 1 },
  crystals: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  crystalValue: { ...type.body, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  totals: { flexDirection: 'row', gap: space.lg },
  total: { flex: 1, minWidth: 0, gap: 5 },
  totalLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  totalLabel: { ...type.caption, color: colors.textMuted },
  totalValue: { ...type.label, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], flexShrink: 1 },
  totalGoal: { ...type.caption, fontWeight: '400', color: colors.textMuted },
  demo: {
    minHeight: 22,
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    borderWidth: border.hairline,
    borderColor: colors.warning,
  },
  demoText: { ...type.caption, color: colors.warning },
});
