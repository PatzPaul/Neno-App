import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Mic, Search as SearchIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Schemas } from '@/api/client';
import { useSearch } from '@/api/queries';
import { Chips, QueryState, ScreenHeader, SectionLabel } from '@/components/controls';
import { parseOsis, useReader } from '@/features/bible/store';
import { useSettings } from '@/store/settings';
import { color, font, hit, icon, space, type } from '@/theme';

type Scope = Schemas['SearchScope'] | 'all';
const SCOPES: Schemas['SearchScope'][] = ['bible', 'egw', 'beliefs', 'hymns', 'video'];

/** Screen 1i — grouped search across Bible, EGW, beliefs, hymns and video. */
export default function SearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; scope?: Schemas['SearchScope'] }>();
  const [q, setQ] = useState(params.q ?? '');
  const [scope, setScope] = useState<Scope>(params.scope ?? 'all');
  const uiLang = useSettings((s) => s.uiLang);
  const res = useSearch(q, uiLang, scope === 'all' ? undefined : scope);
  const goTo = useReader((s) => s.goTo);

  const open = (h: Schemas['SearchHit']) => {
    const hit = h as Schemas['SearchHit'] & { edition_id?: number; chapter?: number };
    switch (h.target) {
      case 'verse': {
        const r = parseOsis(h.target_ref);
        goTo(r.book, r.chapter);
        router.navigate('/biblia');
        return;
      }
      case 'egw_paragraph':
        if (hit.edition_id) router.push(`/egw/${hit.edition_id}/${hit.chapter ?? 1}` as Href);
        return;
      case 'belief':
        router.push(`/belief/${h.target_ref}`);
        return;
      case 'hymn': {
        const [code, n] = h.target_ref.split('/');
        router.push(`/hymn/${code}/${n}` as Href);
        return;
      }
      default:
        router.navigate('/');
    }
  };

  const groups = res.data?.groups.filter((g) => g.hits.length > 0) ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={t('common.search')} />
      <View style={styles.fieldRow}>
        <View style={styles.field}>
          <SearchIcon size={icon.inline + 4} strokeWidth={icon.strokeWidth} color={color.neutral700} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder={t('search.placeholder')}
            placeholderTextColor={color.neutral500}
            returnKeyType="search"
            style={styles.input}
            accessibilityLabel={t('common.search')}
          />
        </View>
        {/* Voice search needs a speech recognizer module; shown per design, not yet active. */}
        <View accessibilityLabel={t('search.voice')} accessibilityState={{ disabled: true }} style={[styles.mic, { opacity: 0.4 }]}>
          <Mic size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
        </View>
      </View>
      <View style={{ paddingVertical: 10 }}>
        <Chips<Scope>
          value={scope}
          onChange={setScope}
          options={[{ value: 'all', label: t('search.all') }, ...SCOPES.map((s) => ({ value: s, label: t(`search.chips.${s}`) }))]}
        />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + 24 }}>
        {q.trim().length < 2 ? <Text style={styles.hint}>{t('search.hint')}</Text> : null}
        <QueryState loading={res.isFetching && !res.data} error={res.isError} onRetry={() => res.refetch()} />
        {res.data && groups.length === 0 && q.trim().length >= 2 ? <Text style={styles.hint}>{t('search.noResults', { q: q.trim() })}</Text> : null}
        {groups.map((g) => (
          <View key={g.scope} style={{ marginTop: 16 }}>
            <SectionLabel accent style={{ marginBottom: 6 }}>
              {t(`search.groups.${g.scope}`)}
            </SectionLabel>
            {g.hits.map((h) => (
              <Pressable key={`${h.target}:${h.target_ref}`} accessibilityRole="button" onPress={() => open(h)} style={styles.hit}>
                <Text style={styles.hitTitle}>{h.title}</Text>
                <Text style={styles.snippet} numberOfLines={2}>
                  {h.snippet}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.screen, paddingTop: 12 },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: hit.min, paddingHorizontal: 12, borderWidth: 1, borderColor: color.accent, backgroundColor: color.surface },
  input: { flex: 1, fontFamily: font.body, fontSize: type.bodyL, color: color.text, paddingVertical: 0 },
  mic: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  hint: { fontFamily: font.body, fontSize: type.body, color: color.neutral700, paddingTop: 12 },
  hit: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.divider, gap: 2 },
  hitTitle: { fontFamily: font.heading, fontSize: type.reader, color: color.text },
  snippet: { fontFamily: font.body, fontSize: type.body, lineHeight: type.body * 1.45, color: color.neutral700 },
});
