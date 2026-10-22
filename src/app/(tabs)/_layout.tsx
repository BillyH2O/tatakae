import { Tabs } from 'expo-router';

import { en } from '../../i18n/en';
import { TabBar } from '../../ui/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: en.tabs.home }} />
      <Tabs.Screen name="quests" options={{ title: en.tabs.quests }} />
      <Tabs.Screen name="stats" options={{ title: en.tabs.stats }} />
      <Tabs.Screen name="profile" options={{ title: en.tabs.profile }} />
    </Tabs>
  );
}
