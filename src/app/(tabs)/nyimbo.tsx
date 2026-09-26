import { router } from 'expo-router';
import { Headphones, Mic, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Schemas } from '@/api/client';
import { useHymnals, useHymns } from '@/api/queries';
import { MiniPlayer } from '@/audio/MiniPlayer';
import { H2, QueryState, Segmented } from '@/components/controls';
import { useSettings } from '@/store/settings';
import { color, font, icon, space, type } from '@/theme';

/** Screen 1h — hymnal list with number/title search and the mini player band. */
export default function HymnsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const uiLang = useSettings((s) => s.uiLang);
  const hymnals = useHymnals();
  const [picked, setCode] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');

  // Default to the hymnal in the UI language (Nyimbo za Kristo for Swahili), else the first one.
  const code = picked ?? (hymnals.data?.find((h) => h.lang === uiLang) ?? hymnals.data?.[0])?.code ?? '';

  useEffect(() => {
    const id = setTimeout(() => setQ(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  const hymns = useHymns(code, q || undefined);
  const options = useMemo(() => (hymnals.data ?? []).map((h) => ({ value: h.code, label: h.name })), [hymnals.data]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <H2>{t('hymns.title')}</H2>
        <View style={styles.search}>
          <Search size={icon.tab} strokeWidth={icon.strokeWidth} color={color.neutral700} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('hymns.searchPlaceholder')}
            placeholderTextColor={color.neutral700}
            accessibilityLabel={t('hymns.searchPlaceholder')}
            returnKeyType="search"
            autoCorrect={false}
            style={styles.input}
          />
          {/* Voice search arrives with speech-to-text; shown for layout parity with the design. */}
          <View accessibilityLabel={t('hymns.voiceSearch')} accessibilityState={{ disabled: true }} style={{ opacity: 0.6 }}>
            <Mic size={icon.tab} strokeWidth={icon.strokeWidth} color={color.neutral700} />
          </View>
        </View>
        {options.length > 1 ? <Segmented options={options} value={code} onChange={setCode} /> : null}
      </View>

      {hymnals.isPending || (hymns.isPending && !!code) ? (
        <QueryState loading />
      ) : hymnals.isError || hymns.isError ? (
        <QueryState error onRetry={() => (hymnals.isError ? hymnals.refetch() : hymns.refetch())} />
      ) : (
        <FlatList
          data={hymns.data ?? []}
          keyExtractor={(h) => String(h.number)}
          renderItem={({ item }) => <HymnRow hymn={item} onPress={() => router.push(`/hymn/${code}/${item.number}`)} />}
          contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>{t('hymns.noResults')}</Text>}
        />
      )}

      <MiniPlayer />
    </View>
  );
}

function HymnRow({ hymn, onPress }: { hymn: Schemas['HymnSummary']; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${hymn.number}. ${hymn.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(29,31,32,0.07)' }]}>
      <Text style={styles.num}>{hymn.number}</Text>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.title}>
          {hymn.title}
        </Text>
        {hymn.category ? <Text style={styles.cat}>{hymn.category}</Text> : null}
      </View>
      {hymn.has_audio ? (
        <View accessibilityLabel={t('hymns.hasAudio')}>
          <Headphones size={icon.tab} strokeWidth={icon.strokeWidth} color={color.neutral700} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  head: { paddingHorizontal: space.screen, paddingTop: 8, paddingBottom: 12, gap: 12 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12,
    borderWidth: 1, borderColor: color.divider, backgroundColor: color.surface,
  },
  input: { flex: 1, minHeight: 44, fontFamily: font.body, fontSize: type.body, color: color.text, padding: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, borderTopWidth: 1, borderTopColor: color.divider },
  num: { width: 44, fontFamily: font.heading, fontSize: 24, color: color.accent700 },
  title: { fontFamily: font.bodyMedium, fontSize: type.bodyL, color: color.text },
  cat: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  empty: { fontFamily: font.body, fontSize: type.bodyL, color: color.neutral700, textAlign: 'center', paddingVertical: 32 },
});
