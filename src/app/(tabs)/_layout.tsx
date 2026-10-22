import { Tabs } from 'expo-router';

import { en } from '../../i18n/en';

/** The bar itself is drawn once in the root layout, so pushed screens keep it too. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: en.tabs.home }} />
      <Tabs.Screen name="quests" options={{ title: en.tabs.quests }} />
      <Tabs.Screen name="stats" options={{ title: en.tabs.stats }} />
      <Tabs.Screen name="profile" options={{ title: en.tabs.profile }} />
    </Tabs>
  );
}
