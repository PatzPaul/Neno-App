import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font, space, tracking, type } from '@/theme';

/** Placeholder for tabs whose screens are not built yet. */
export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <Text style={styles.sub}>{t('comingSoon')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space.screen, gap: 6 },
  title: { fontFamily: font.heading, fontSize: type.h2, lineHeight: type.h2 * 1.12, letterSpacing: tracking(-0.015, type.h2), color: color.text },
  sub: { fontFamily: font.body, fontSize: type.bodyL, color: color.neutral700 },
});
