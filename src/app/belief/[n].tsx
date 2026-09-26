import { useLocalSearchParams } from 'expo-router';
import { Bookmark } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBelief } from '@/api/queries';
import { QueryState, ScreenHeader, SectionLabel } from '@/components/controls';
import { useSettings } from '@/store/settings';
import { findLiveMark, useUserData } from '@/store/userData';
import { color, font, space, tracking, type } from '@/theme';

/** One Fundamental Belief with its full text (+ second language). */
export default function BeliefScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const n = Number(useLocalSearchParams<{ n: string }>().n);
  const { uiLang, parallelLang, textScale } = useSettings();
  const q = useBelief(n, uiLang);
  const altLang = parallelLang && parallelLang !== uiLang ? parallelLang : null;
  const alt = useBelief(n, altLang ?? uiLang);
  const saved = useUserData((s) => !!findLiveMark(s.marks, 'save', 'belief', String(n)));
  const toggleMark = useUserData((s) => s.toggleMark);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={t('library.beliefs')}
        subtitle={q.data ? t(`library.groups.${q.data.group_key}`) : undefined}
        actions={[{ Icon: Bookmark, label: t('feed.save'), active: saved, onPress: () => toggleMark('save', 'belief', String(n)) }]}
      />
      <ScrollView contentContainerStyle={{ padding: space.screen, gap: 14, paddingBottom: insets.bottom + 24 }}>
        <QueryState loading={q.isPending} error={q.isError} onRetry={() => q.refetch()} />
        {q.data ? (
          <>
            <Text style={styles.num}>{n}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {q.data.title}
            </Text>
            <Text style={[styles.body, { fontSize: type.reader * textScale, lineHeight: type.reader * textScale * 1.6 }]} maxFontSizeMultiplier={2}>
              {q.data.body}
            </Text>
            {altLang && alt.data?.body ? (
              <View style={{ gap: 6, marginTop: 8 }}>
                <SectionLabel>{altLang.toUpperCase()}</SectionLabel>
                <Text style={styles.altTitle}>{alt.data.title}</Text>
                <Text style={[styles.alt, { fontSize: type.body * textScale, lineHeight: type.body * textScale * 1.5 }]}>{alt.data.body}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  num: { fontFamily: font.heading, fontSize: type.h1, color: color.accent700 },
  title: { fontFamily: font.heading, fontSize: type.h2, lineHeight: type.h2 * 1.12, letterSpacing: tracking(-0.015, type.h2), color: color.text },
  body: { fontFamily: font.body, color: color.text },
  altTitle: { fontFamily: font.heading, fontSize: type.h6, color: color.neutral800 },
  alt: { fontFamily: font.body, color: color.neutral700 },
});
