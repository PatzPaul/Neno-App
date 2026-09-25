import type { BottomTabBarProps } from 'expo-router/tabs';
import { BookOpen, House, Library, Music, User, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, font, icon, layout } from '@/theme';

const TABS: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: House, label: 'tabs.feed' },
  biblia: { icon: BookOpen, label: 'tabs.bible' },
  maktaba: { icon: Library, label: 'tabs.library' },
  nyimbo: { icon: Music, label: 'tabs.hymns' },
  mimi: { icon: User, label: 'tabs.me' },
};

/** 60dp bar, 5 equal columns, 1px divider on top. Active = accent700, inactive = neutral600. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: layout.tabBar + insets.bottom }]}>
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const tint = focused ? color.accent700 : color.neutral600;
        const Icon = tab.icon;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            style={styles.tab}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
            }}>
            <Icon size={icon.tab} strokeWidth={icon.strokeWidth} color={tint} />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {t(tab.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: color.divider },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: layout.tabBar },
  label: { fontFamily: font.body, fontSize: 11 },
});
