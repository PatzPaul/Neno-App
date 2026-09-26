import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QueryState, ScreenHeader, SectionLabel } from '@/components/controls';
import { useBibleBooks, type BibleBook } from '@/features/bible/books';
import { PRIMARY_TRANSLATION, useReader } from '@/features/bible/store';
import { useSettings } from '@/store/settings';
import { color, font, hit, space, type } from '@/theme';

/** Book → chapter picker for the Bible reader. */
export default function BibleBooksScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const uiLang = useSettings((s) => s.uiLang);
  const translation = PRIMARY_TRANSLATION[uiLang] ?? 'SUV';
  const books = useBibleBooks(translation);
  const { book: current, goTo } = useReader();
  const [open, setOpen] = useState<string | null>(current);

  const pick = (b: BibleBook, ch: number) => {
    goTo(b.osis, ch);
    router.back();
  };

  const section = (testament: 'OT' | 'NT', label: string) => (
    <View key={testament}>
      <SectionLabel style={{ marginTop: 18, marginBottom: 6 }}>{label}</SectionLabel>
      {books.data
        ?.filter((b) => b.testament === testament)
        .map((b) => (
          <View key={b.osis}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open === b.osis, disabled: b.chapters === 0 }}
              disabled={b.chapters === 0}
              onPress={() => setOpen(open === b.osis ? null : b.osis)}
              style={styles.bookRow}>
              <Text style={[styles.bookName, b.chapters === 0 && { color: color.neutral500 }, b.osis === current && { color: color.accent700 }]}>{b.name}</Text>
              <Text style={styles.count}>{b.chapters || '—'}</Text>
            </Pressable>
            {open === b.osis && b.chapters > 0 ? (
              <View style={styles.grid}>
                {Array.from({ length: b.chapters }, (_, i) => i + 1).map((ch) => (
                  <Pressable key={ch} accessibilityRole="button" accessibilityLabel={`${b.name} ${ch}`} onPress={() => pick(b, ch)} style={styles.cell}>
                    <Text style={styles.cellText}>{ch}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ))}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={t('bible.books')} subtitle={translation} />
      <QueryState loading={books.isPending} error={books.isError} onRetry={() => books.refetch()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + 24 }}>
        {books.data ? [section('OT', t('bible.ot')), section('NT', t('bible.nt'))] : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  bookRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: color.divider },
  bookName: { flex: 1, fontFamily: font.heading, fontSize: type.h6, color: color.text },
  count: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 12 },
  cell: { width: hit.min, height: hit.min, borderWidth: 1, borderColor: color.divider, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontFamily: font.heading, fontSize: type.ui, color: color.text },
});
