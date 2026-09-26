import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Schemas } from '@/api/client';
import { useSabbathSchool } from '@/api/queries';
import { Blueprint } from '@/components/Blueprint';
import { QueryState, ScreenHeader, SectionLabel } from '@/components/controls';
import { PrimaryButton } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useUserData } from '@/store/userData';
import { color, font, space, tracking, type } from '@/theme';

const dayKey = (w: Schemas['SabbathSchoolWeek'], idx: number) => `${w.year}Q${w.quarter}L${w.lesson_n}D${idx}`;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Screen 1g — Sabbath School lesson of the week. */
export default function SabbathSchoolScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const uiLang = useSettings((s) => s.uiLang);
  const q = useSabbathSchool(uiLang);
  const w = q.data;
  const today = ymd(new Date());
  const todayIdx = w?.days.find((d) => d.date === today)?.day_idx ?? 0;
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const active = dayIdx ?? todayIdx;
  const day = w?.days.find((d) => d.day_idx === active);
  const answers = useUserData((s) => s.answers);
  const dayNames = t('library.ss.days', { returnObjects: true }) as string[];

  const fmt = useMemo(() => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }), [i18n.language]);
  const range = w
    ? (() => {
        const start = new Date(`${w.week_start}T12:00:00`);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${fmt.format(start)} – ${fmt.format(end)}`;
      })()
    : '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={t('library.ss.title')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.band}>
          <Text style={styles.bandLabel}>{t('library.ss.startsFriday')}</Text>
          <Text style={styles.bandValue}>{range}</Text>
        </View>
        <QueryState loading={q.isPending} error={q.isError} onRetry={() => q.refetch()} />
        {w ? (
          <View style={{ padding: space.screen, gap: 12 }}>
            <SectionLabel accent>{`${w.quarter_title} · ${t('library.ss.quarter', { q: w.quarter, year: w.year })}`}</SectionLabel>
            <Text style={styles.h2}>
              {t('library.ss.lessonN', { n: w.lesson_n })}: {w.lesson_title}
            </Text>
            <Text style={styles.sub}>{range}</Text>

            <View style={styles.strip} accessibilityRole="tablist">
              {w.days.map((d, i) => {
                const isActive = d.day_idx === active;
                const isToday = d.date === today;
                const answered = !!answers[`ss_day:${dayKey(w, d.day_idx)}`]?.answer || (d.date ?? '') < today;
                return (
                  <Pressable
                    key={d.day_idx}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setDayIdx(d.day_idx)}
                    style={[
                      styles.cell,
                      i > 0 && styles.cellSep,
                      answered && { backgroundColor: color.accent100 },
                      isToday && { backgroundColor: color.accent },
                      isActive && !isToday && styles.cellActive,
                    ]}>
                    <Text style={[styles.cellText, { color: isToday ? color.bg : answered ? color.accent800 : color.text }]}>{dayNames[d.day_idx]}</Text>
                    <Text style={[styles.cellMark, { color: isToday ? color.bg : color.accent800 }]}>{answered && !isToday ? '✓' : isToday ? '•' : ' '}</Text>
                  </Pressable>
                );
              })}
            </View>

            {day ? <Day key={`${w.lesson_n}-${day.day_idx}`} week={w} day={day} /> : null}

            {w.memory_text ? (
              <Blueprint style={styles.memory}>
                <SectionLabel accent>{`${t('library.ss.memory')}${w.memory_ref ? ` · ${w.memory_ref}` : ''}`}</SectionLabel>
                <Text style={styles.memoryText}>{w.memory_text}</Text>
              </Blueprint>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Day({ week, day }: { week: Schemas['SabbathSchoolWeek']; day: Schemas['SabbathSchoolDay'] }) {
  const { t } = useTranslation();
  const key = dayKey(week, day.day_idx);
  const saved = useUserData((s) => s.answers[`ss_day:${key}`]?.answer ?? '');
  const setAnswer = useUserData((s) => s.setAnswer);
  const [text, setText] = useState(saved);
  const [justSaved, setJustSaved] = useState(false);

  return (
    <View style={{ gap: 10, marginTop: 6 }}>
      <Text style={styles.dayTitle}>{day.title}</Text>
      <Text style={styles.dayBody}>{day.body}</Text>
      {day.question ? (
        <>
          <SectionLabel style={{ marginTop: 8 }}>{t('library.ss.question')}</SectionLabel>
          <Text style={styles.prompt}>{day.question}</Text>
          <TextInput
            multiline
            value={text}
            onChangeText={(v) => {
              setText(v);
              setJustSaved(false);
            }}
            placeholder={t('library.ss.answerPlaceholder')}
            placeholderTextColor={color.neutral500}
            style={styles.input}
            textAlignVertical="top"
          />
          <PrimaryButton
            label={justSaved ? t('library.ss.saved') : t('library.ss.save')}
            disabled={!text.trim() || text === saved}
            onPress={() => {
              setAnswer('ss_day', key, { answer: text.trim() });
              setJustSaved(true);
            }}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  band: { backgroundColor: color.accent900, paddingHorizontal: space.screen, paddingVertical: 14, gap: 2 },
  bandLabel: { fontFamily: font.body, fontSize: type.caption, color: color.accent200 },
  bandValue: { fontFamily: font.heading, fontSize: type.h5, color: color.bg },
  h2: { fontFamily: font.heading, fontSize: type.h2, lineHeight: type.h2 * 1.12, letterSpacing: tracking(-0.015, type.h2), color: color.text },
  sub: { fontFamily: font.body, fontSize: type.small, color: color.neutral700 },
  strip: { flexDirection: 'row', borderWidth: 1, borderColor: color.divider, marginTop: 6 },
  cell: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cellSep: { borderLeftWidth: 1, borderLeftColor: color.divider },
  cellActive: { borderBottomWidth: 2, borderBottomColor: color.accent },
  cellText: { fontFamily: font.body, fontSize: type.caption },
  cellMark: { fontFamily: font.body, fontSize: type.caption },
  dayTitle: { fontFamily: font.heading, fontSize: type.h5, color: color.text },
  dayBody: { fontFamily: font.body, fontSize: type.bodyL, lineHeight: type.bodyL * 1.6, color: color.text },
  prompt: { fontFamily: font.bodyMedium, fontSize: type.bodyL, color: color.text },
  input: {
    minHeight: 96, backgroundColor: color.surface, borderWidth: 1, borderColor: color.divider, padding: 12,
    fontFamily: font.body, fontSize: type.bodyL, color: color.text,
  },
  memory: { padding: 16, gap: 8, marginTop: 10 },
  memoryText: { fontFamily: font.heading, fontSize: 21, lineHeight: 21 * 1.25, color: color.text },
});
