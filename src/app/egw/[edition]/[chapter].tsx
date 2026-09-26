import { router, useLocalSearchParams } from 'expo-router';
import { Bookmark, ChevronLeft, ChevronRight, Type } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEgwChapter } from '@/api/queries';
import { QueryState, ScreenHeader } from '@/components/controls';
import { useSettings } from '@/store/settings';
import { findLiveMark, useUserData } from '@/store/userData';
import { color, font, hit, icon, type } from '@/theme';

/** Screen 2a — EGW book reader. Tap a paragraph to highlight it. */
export default function EgwReaderScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ edition: string; chapter: string }>();
  const edition = Number(params.edition);
  const chapter = Number(params.chapter) || 1;
  const { uiLang, parallelLang, textScale, set: setSettings } = useSettings();
  const q = useEgwChapter(edition, chapter, parallelLang && parallelLang !== uiLang ? parallelLang : null);
  const d = q.data;

  const marks = useUserData((s) => s.marks);
  const { putMark, removeMark, toggleMark, setProgress } = useUserData.getState();
  const firstRef = d?.paragraphs[0]?.refcode;
  const bookmarked = !!(firstRef && findLiveMark(marks, 'save', 'egw_paragraph', firstRef));

  const highlights = useMemo(() => {
    const m = new Map<string, string>();
    for (const mk of Object.values(marks)) if (mk.kind === 'highlight' && mk.target === 'egw_paragraph' && !mk.deleted_at) m.set(mk.target_ref, mk.id);
    return m;
  }, [marks]);

  // Reading progress per edition: position = chapter, percent = chapter share.
  useEffect(() => {
    if (d) setProgress('egw_paragraph', String(edition), { position: String(chapter), percent: Math.round((chapter / Math.max(1, d.chapters)) * 100) });
  }, [d, edition, chapter, setProgress]);

  const go = (n: number) => router.replace(`/egw/${edition}/${n}`);
  const size = type.reader * textScale;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={d?.title ?? ''}
        subtitle={d ? `${t('library.chapterN', { n: chapter })}${d.chapter_title ? ` · ${d.chapter_title}` : ''}` : undefined}
        actions={[
          { Icon: Type, label: t('common.textSize'), onPress: () => setSettings({ textScale: textScale >= 1.75 ? 1 : textScale + 0.25 }) },
          { Icon: Bookmark, label: t('feed.save'), active: bookmarked, onPress: () => firstRef && toggleMark('save', 'egw_paragraph', firstRef) },
        ]}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <QueryState loading={q.isPending} error={q.isError} onRetry={() => q.refetch()} />
        {d?.paragraphs.map((p) => {
          const hl = highlights.get(p.refcode);
          return (
            <Pressable
              key={p.refcode}
              accessibilityRole="button"
              accessibilityState={{ selected: !!hl }}
              onPress={() => (hl ? removeMark(hl) : putMark({ kind: 'highlight', target: 'egw_paragraph', target_ref: p.refcode, color: 'accent' }))}
              onLongPress={() => router.push({ pathname: '/note-edit', params: { target: 'egw_paragraph', ref: p.refcode, label: `${d.title} · ${p.refcode}` } })}
              style={[styles.para, hl && { backgroundColor: color.accent100 }]}>
              <Text style={styles.ref}>{p.refcode}</Text>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.text, { fontSize: size, lineHeight: size * 1.6 }]} maxFontSizeMultiplier={2}>
                  {p.text}
                </Text>
                {p.parallel_text ? (
                  <Text style={[styles.parallel, { fontSize: type.body * textScale, lineHeight: type.body * textScale * 1.5 }]} maxFontSizeMultiplier={2}>
                    {p.parallel_text}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {d ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('bible.prev')} disabled={chapter <= 1} onPress={() => go(chapter - 1)} style={[styles.navBtn, chapter <= 1 && { opacity: 0.3 }]}>
            <ChevronLeft size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
          </Pressable>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(chapter / d.chapters) * 100}%` }]} />
            </View>
            <Text style={styles.footerText}>{t('library.chapterOf', { n: chapter, total: d.chapters })}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('bible.next')}
            disabled={chapter >= d.chapters}
            onPress={() => go(chapter + 1)}
            style={[styles.navBtn, chapter >= d.chapters && { opacity: 0.3 }]}>
            <ChevronRight size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: 18, paddingVertical: 14, gap: 6 },
  para: { flexDirection: 'row', gap: 10, paddingVertical: 8, paddingHorizontal: 8, marginHorizontal: -8 },
  ref: { width: 44, fontFamily: font.heading, fontSize: type.small, color: color.accent700, paddingTop: 4 },
  text: { fontFamily: font.body, color: color.text },
  parallel: { fontFamily: font.body, color: color.neutral700 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, minHeight: 56, borderTopWidth: 1, borderTopColor: color.divider },
  navBtn: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  track: { height: 2, backgroundColor: color.neutral300 },
  fill: { height: 2, backgroundColor: color.accent },
  footerText: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700, textAlign: 'center' },
});
