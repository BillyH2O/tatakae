import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { border, colors, glow, panel, radius, space, touch, type } from '../theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, IconName> = {
  index: 'home-variant',
  quests: 'clipboard-text-outline',
  stats: 'chart-bar',
  profile: 'account-outline',
};

const TAB_BAR_ALPHA = 0.9;

/** Four tabs in a floating card; the active one is bright, with a short underline. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <View style={styles.card} role="tablist">
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const title = descriptors[route.key]?.options.title ?? route.name;
          const color = focused ? colors.actionBright : colors.textMuted;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              role="tab"
              aria-selected={focused}
              aria-label={title}
            >
              <MaterialCommunityIcons name={ICONS[route.name] ?? 'circle-outline'} size={24} color={color} />
              <Text style={[styles.label, { color }, focused && styles.labelActive]} numberOfLines={1}>
                {title}
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
    paddingVertical: space.xs,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: touch.min + space.md, gap: 2 },
  label: { ...type.caption, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
  indicator: { height: 2, width: 28, borderRadius: 1, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.actionBright },
});
