import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { border, colors, panel, space, touch, type } from '../theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, IconName> = {
  index: 'home-variant',
  quests: 'sword-cross',
  stats: 'chart-bar',
  profile: 'account-circle',
};

const TAB_BAR_ALPHA = 0.92;

/** Four tabs, icon + label; the active tab is bright blue with a 2 pt underline. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, space.xs) }]} role="tablist">
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
            <View style={[styles.indicator, focused && styles.indicatorActive]} />
            <MaterialCommunityIcons name={ICONS[route.name] ?? 'circle-outline'} size={22} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: panel(TAB_BAR_ALPHA),
    borderTopWidth: border.hairline,
    borderTopColor: colors.border,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: touch.min + space.md, gap: 2 },
  indicator: { position: 'absolute', top: 0, height: 2, width: '40%', backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.actionBright },
  label: { ...type.caption, fontWeight: '500' },
});
