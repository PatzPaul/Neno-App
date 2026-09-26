import { router } from 'expo-router';
import { CalendarDays, Search } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Schemas } from '@/api/client';
import { useBeliefs, useCourses, useEgwBooks } from '@/api/queries';
import { Blueprint } from '@/components/Blueprint';
import { H2, ListRow, QueryState, Segmented, SectionLabel } from '@/components/controls';
import { Stripes } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useUserData } from '@/store/userData';
import { color, font, hit, icon, space, type } from '@/theme';

type Tab = 'egw' | 'beliefs' | 'courses';

/** Screen 1f (EGW) / 2b (Imani 28) / courses list. */
export default function LibraryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('egw');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}>
      <View style={styles.titleRow}>
        <H2>{t('library.title')}</H2>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.search')} onPress={() => router.push('/search')} style={styles.iconBtn}>
          <Search size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: space.screen }}>
        <ListRow onPress={() => router.push('/sabbath-school')} height={52}>
          <CalendarDays size={20} strokeWidth={icon.strokeWidth} color={color.accent700} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t('library.ss.title')}</Text>
            <Text style={styles.rowSub}>{t('library.ss.entry')}</Text>
          </View>
        </ListRow>
        <Segmented<Tab>
          style={{ marginTop: 12 }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'egw', label: t('library.egw') },
            { value: 'beliefs', label: t('library.beliefs') },
            { value: 'courses', label: t('library.courses') },
          ]}
        />
      </View>

      {tab === 'egw' ? <EgwTab /> : tab === 'beliefs' ? <BeliefsTab /> : <CoursesTab />}
    </ScrollView>
  );
}

function EgwTab() {
  const { t } = useTranslation();
  const uiLang = useSettings((s) => s.uiLang);
  const books = useEgwBooks(uiLang);
  const progress = useUserData((s) => s.progress);

  // Most recently read edition (progress target egw_paragraph keyed by edition id, position = chapter).
  const last = Object.values(progress)
    .filter((p) => p.target === 'egw_paragraph')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const lastBook = last && books.data?.find((b) => String(b.edition_id) === last.target_ref);

  return (
    <View style={{ paddingHorizontal: space.screen, paddingTop: 20, gap: 20 }}>
      <QueryState loading={books.isPending} error={books.isError} empty={books.data?.length === 0} onRetry={() => books.refetch()} />
      {lastBook ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(`/egw/${lastBook.edition_id}/${last!.position ?? 1}`)}>
          <Blueprint style={styles.continueCard}>
            <SectionLabel accent>{t('library.continue')}</SectionLabel>
            <Text style={styles.continueTitle}>{lastBook.title}</Text>
            <Text style={styles.rowSub}>
              {t('library.author')} · {t('library.chapterOf', { n: last!.position ?? 1, total: lastBook.chapters })}
            </Text>
            <View style={styles.progressRow}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${last!.percent ?? 0}%` }]} />
              </View>
              <Text style={styles.pct}>{last!.percent ?? 0}%</Text>
            </View>
          </Blueprint>
        </Pressable>
      ) : null}
      <View style={styles.grid}>
        {books.data?.map((b) => (
          <Pressable key={b.edition_id} accessibilityRole="button" style={styles.bookCell} onPress={() => router.push(`/egw/${b.edition_id}/1`)}>
            <Blueprint style={styles.cover}>
              <Stripes />
              <Text style={styles.coverCode}>{b.book_code}</Text>
            </Blueprint>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {b.title}
            </Text>
            <Text style={styles.rowSub} numberOfLines={1}>
              {b.original_title}
            </Text>
            <Text style={styles.status}>{t('library.chaptersCount', { n: b.chapters })}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const GROUP_ORDER: Schemas['Belief']['group_key'][] = ['god', 'humanity', 'salvation', 'church', 'christian_life', 'last_things'];

function BeliefsTab() {
  const { t } = useTranslation();
  const { uiLang, parallelLang } = useSettings();
  const beliefs = useBeliefs(uiLang);
  const alt = useBeliefs(parallelLang && parallelLang !== uiLang ? parallelLang : uiLang);
  const altTitle = (n: number) => (parallelLang && parallelLang !== uiLang ? alt.data?.find((b) => b.n === n)?.title : undefined);

  return (
    <View style={{ paddingHorizontal: space.screen, paddingTop: 8 }}>
      <QueryState loading={beliefs.isPending} error={beliefs.isError} empty={beliefs.data?.length === 0} onRetry={() => beliefs.refetch()} />
      {GROUP_ORDER.map((g) => {
        const items = beliefs.data?.filter((b) => b.group_key === g) ?? [];
        if (!items.length) return null;
        return (
          <View key={g} style={{ marginTop: 18 }}>
            <View style={styles.groupHead}>
              <SectionLabel accent>{t(`library.groups.${g}`)}</SectionLabel>
              <Text style={styles.range}>
                {items[0].n}–{items[items.length - 1].n}
              </Text>
            </View>
            {items.map((b) => (
              <ListRow key={b.n} onPress={() => router.push(`/belief/${b.n}`)}>
                <Text style={styles.beliefN}>{b.n}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{b.title}</Text>
                  {altTitle(b.n) ? <Text style={styles.rowSub}>{altTitle(b.n)}</Text> : null}
                </View>
              </ListRow>
            ))}
          </View>
        );
      })}
    </View>
  );
}

function CoursesTab() {
  const { t } = useTranslation();
  const uiLang = useSettings((s) => s.uiLang);
  const courses = useCourses(uiLang);
  const progress = useUserData((s) => s.progress);

  return (
    <View style={{ paddingHorizontal: space.screen, paddingTop: 20 }}>
      <QueryState loading={courses.isPending} error={courses.isError} empty={courses.data?.length === 0} onRetry={() => courses.refetch()} />
      {courses.data?.map((c) => {
        const p = progress[`course_lesson:${c.id}`];
        const done = Number(p?.position ?? 0);
        const next = Math.min(done + 1, c.lessons);
        return (
          <ListRow key={c.id} height={64} onPress={() => router.push(`/course/${c.id}/${next}`)}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.courseTitle}>{c.title}</Text>
              <View style={styles.progressRow}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round((done / Math.max(1, c.lessons)) * 100)}%` }]} />
                </View>
                <Text style={styles.pct}>{t('library.lessonsCount', { n: c.lessons })}</Text>
              </View>
            </View>
          </ListRow>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.screen, paddingRight: 8, marginBottom: 8 },
  iconBtn: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: font.bodyMedium, fontSize: type.bodyL, color: color.text },
  rowSub: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  continueCard: { padding: 16, gap: 6 },
  continueTitle: { fontFamily: font.heading, fontSize: type.h4, color: color.text },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  track: { flex: 1, height: 2, backgroundColor: color.neutral300 },
  fill: { height: 2, backgroundColor: color.accent },
  pct: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 18 },
  bookCell: { width: '47%', gap: 4 },
  cover: { height: 112, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  coverCode: { fontFamily: font.mono, fontSize: 11, backgroundColor: color.bg, paddingVertical: 3, paddingHorizontal: 6, color: color.text },
  bookTitle: { fontFamily: font.heading, fontSize: type.reader, lineHeight: type.reader * 1.15, color: color.text },
  status: { fontFamily: font.body, fontSize: type.caption, color: color.accent700 },
  groupHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  range: { fontFamily: font.body, fontSize: type.label, color: color.neutral600 },
  beliefN: { width: 32, fontFamily: font.heading, fontSize: type.h4, color: color.accent700 },
  courseTitle: { fontFamily: font.heading, fontSize: type.h6, color: color.text },
});
