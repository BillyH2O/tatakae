import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePathname, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { en } from '../../i18n/en';
import { border, colors, glow, panel, radius, space, touch, type } from '../theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type TabPath = '/' | '/quests' | '/stats' | '/profile';

const TABS: readonly { path: TabPath; label: string; icon: IconName; iconActive: IconName }[] = [
  { path: '/', label: en.tabs.home, icon: 'home-outline', iconActive: 'home' },
  { path: '/quests', label: en.tabs.quests, icon: 'clipboard-text-outline', iconActive: 'clipboard-text' },
  { path: '/stats', label: en.tabs.stats, icon: 'chart-bar', iconActive: 'chart-bar' },
  { path: '/profile', label: en.tabs.profile, icon: 'account-outline', iconActive: 'account' },
];

const TAB_BAR_ALPHA = 0.9;

/** Tab owning a route, so the bar stays meaningful on pushed screens (focus, settings, forms). */
export function tabForPath(pathname: string): TabPath {
  if (pathname.startsWith('/quest')) return '/quests';
  if (pathname.startsWith('/stats') || pathname.startsWith('/session')) return '/stats';
  if (pathname.startsWith('/profile') || pathname.startsWith('/settings')) return '/profile';
  return '/';
}

/** Four tabs in a floating card, shown on every screen; the active one is bright, with an underline. */
export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = tabForPath(pathname);

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <View style={styles.card} role="tablist">
        {TABS.map((tab) => {
          const focused = tab.path === current;
          const color = focused ? colors.actionBright : colors.textMuted;
          return (
            <Pressable
              key={tab.path}
              onPress={() => {
                if (pathname !== tab.path) router.navigate(tab.path);
              }}
              style={styles.tab}
              role="tab"
              aria-selected={focused}
              aria-label={tab.label}
            >
              <MaterialCommunityIcons name={focused ? tab.iconActive : tab.icon} size={26} color={color} />
              <Text style={[styles.label, { color }, focused && styles.labelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: space.md, paddingTop: space.xs },
  card: {
    flexDirection: 'row',
    backgroundColor: panel(TAB_BAR_ALPHA),
    borderWidth: border.thin,
    borderColor: colors.border,
    borderRadius: radius.lg,
    boxShadow: glow,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: touch.min + space.md, gap: 2 },
  label: { ...type.label, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
  indicator: { marginTop: 4, height: 3, width: 44, borderRadius: 2, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.actionBright, boxShadow: '0 0 8px rgba(76,155,255,0.8)' },
});
