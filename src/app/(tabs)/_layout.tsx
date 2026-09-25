import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/TabBar';
import { color } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="biblia" />
      <Tabs.Screen name="maktaba" />
      <Tabs.Screen name="nyimbo" />
      <Tabs.Screen name="mimi" />
    </Tabs>
  );
}
