import { router } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBibleChapter } from '@/api/queries';
import { Chips, H2 } from '@/components/controls';
import { Tag } from '@/components/ui';
import { formatTarget, parseOsis } from '@/features/notes/refs';
import { useSettings } from '@/store/settings';
import { useUserData, type Mark } from '@/store/userData';
import { color, font, hit, icon, space, type } from '@/theme';

type Filter = 'all' | 'highlight' | 'note' | 'save';
type Osis = NonNullable<ReturnType<typeof parseOsis>>;

/** Screen 2e — the reader's highlights, notes and saved items, newest first. */
export default function NotesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const marks = useUserData((s) => s.marks);
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(
    () =>
      Object.values(marks)
        .filter((m) => !m.deleted_at && m.kind !== 'like' && (filter === 'all' || m.kind === filter))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [marks, filter],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.back}>
          <ChevronLeft size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
        </Pressable>
        <H2>{t('notes.title')}</H2>
      </View>
      <View style={{ marginBottom: 6 }}>
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('notes.all') },
            { value: 'highlight', label: t('notes.highlight') },
            { value: 'note', label: t('notes.note') },
            { value: 'save', label: t('notes.save') },
          ]}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <NoteEntry mark={item} />}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + 20 }}
        ListEmptyComponent={<Text style={styles.empty}>{t('notes.empty')}</Text>}
      />
    </View>
  );
}

function NoteEntry({ mark }: { mark: Mark }) {
  const { t, i18n } = useTranslation();
  const removeMark = useUserData((s) => s.removeMark);
  const label = formatTarget(mark.target, mark.target_ref, i18n.language, t);
  const date = formatShortDate(mark.updated_at, t);
  const verse = mark.target === 'verse' ? parseOsis(mark.target_ref) : null;

  return (
    <View style={styles.entry}>
      <View style={styles.entryHead}>
        <Tag label={t(`notes.${mark.kind}`)} />
        <Text numberOfLines={1} style={styles.ref}>
          {label}
        </Text>
        <Text style={styles.date}>{date}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('common.delete')} ${label}`} onPress={() => removeMark(mark.id)} style={styles.del}>
          <Trash2 size={icon.inline + 2} strokeWidth={icon.strokeWidth} color={color.neutral600} />
        </Pressable>
      </View>
      {verse?.verse ? <VerseQuote verse={{ ...verse, verse: verse.verse }} /> : null}
      {mark.note ? <Text style={styles.note}>{mark.note}</Text> : null}
    </View>
  );
}

/** Quoted verse text from the (cached) chapter in the reader's translation, when it can be loaded. */
function VerseQuote({ verse: p }: { verse: Osis & { verse: number } }) {
  const uiLang = useSettings((s) => s.uiLang);
  const translation = uiLang === 'en' ? 'KJV' : 'SUV';
  const chapter = useBibleChapter(translation, p.book, p.chapter);
  if (!chapter.data) return null;
  const last = p.verseEnd ?? p.verse;
  const text = chapter.data.verses
    .filter((v) => v.verse >= p.verse && v.verse <= last)
    .map((v) => v.text)
    .join(' ');
  return text ? <Text style={styles.quote}>{text}</Text> : null;
}

function formatShortDate(iso: string, t: (k: string, o?: Record<string, unknown>) => unknown): string {
  const d = new Date(iso);
  const months = t('sunset.months', { returnObjects: true }) as string[];
  return `${d.getDate()} ${months[d.getMonth()] ?? ''}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 10 },
  back: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  entry: { gap: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: color.divider },
  entryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ref: { flexShrink: 1, fontFamily: font.heading, fontSize: type.ui, color: color.text },
  date: { marginLeft: 'auto', fontFamily: font.body, fontSize: type.caption, color: color.neutral600 },
  del: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center', marginVertical: -12, marginRight: -12 },
  quote: { fontFamily: font.body, fontSize: type.bodyL, lineHeight: type.bodyL * 1.5, color: color.text, backgroundColor: color.accent100, paddingVertical: 6, paddingHorizontal: 8 },
  note: {
    fontFamily: font.body, fontSize: type.body, lineHeight: type.body * 1.5, color: color.neutral800,
    paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: color.accent,
  },
  empty: { fontFamily: font.body, fontSize: type.bodyL, color: color.neutral700, textAlign: 'center', paddingVertical: 40 },
});
