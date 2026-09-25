import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL } from '@/api/client';
import { Toggle } from '@/components/ui';
import { UI_LANGS } from '@/i18n';
import { useSettings } from '@/store/settings';
import { color, font, space, tracking, type } from '@/theme';

export default function MeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uiLang, parallelLang, dataSaver, set } = useSettings();

  const nextLang = UI_LANGS[(UI_LANGS.indexOf(uiLang) + 1) % UI_LANGS.length];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 24 }}>
      <Text style={styles.title}>{t('tabs.me')}</Text>
      <Text style={styles.section}>{t('me.settings')}</Text>

      <Pressable accessibilityRole="button" style={styles.row} onPress={() => set({ uiLang: nextLang })}>
        <Text style={styles.rowLabel}>{t('me.language')}</Text>
        <Text style={styles.rowValue}>{t(`langs.${uiLang}.name`)}</Text>
      </Pressable>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('me.parallel')}</Text>
        <Toggle
          label={t('me.parallel')}
          value={parallelLang !== null}
          onChange={(on) => set({ parallelLang: on ? (uiLang === 'en' ? 'sw' : 'en') : null })}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('me.dataSaver')}</Text>
        <Toggle label={t('me.dataSaver')} value={dataSaver} onChange={(v) => set({ dataSaver: v })} />
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('me.server')}</Text>
        <Text style={styles.rowValue} selectable>
          {API_URL}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space.screen },
  title: { fontFamily: font.heading, fontSize: type.h2, lineHeight: type.h2 * 1.12, letterSpacing: tracking(-0.015, type.h2), color: color.text },
  section: {
    fontFamily: font.body, fontSize: type.label, letterSpacing: tracking(0.1, type.label), textTransform: 'uppercase',
    color: color.neutral600, marginTop: 24, marginBottom: 6,
  },
  row: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    borderTopWidth: 1, borderTopColor: color.divider,
  },
  rowLabel: { fontFamily: font.bodyMedium, fontSize: type.bodyL, color: color.text },
  rowValue: { flexShrink: 1, fontFamily: font.body, fontSize: type.small, color: color.neutral700, textAlign: 'right' },
});
