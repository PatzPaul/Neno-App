import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Schemas } from '@/api/client';
import { useCourseLesson } from '@/api/queries';
import { Blueprint } from '@/components/Blueprint';
import { QueryState, ScreenHeader, SectionLabel } from '@/components/controls';
import { PrimaryButton, Stripes } from '@/components/ui';
import { parseOsis, PRIMARY_TRANSLATION } from '@/features/bible/store';
import { useBookName } from '@/features/bible/books';
import { useSettings } from '@/store/settings';
import { useUserData } from '@/store/userData';
import { color, font, space, tracking, type } from '@/theme';

/** Screen 2c — course lesson with a single-choice quiz and immediate feedback. */
export default function CourseLessonScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; n: string }>();
  const id = Number(params.id);
  const n = Number(params.n) || 1;
  const q = useCourseLesson(id, n);
  const d = q.data;
  const setProgress = useUserData((s) => s.setProgress);
  const progress = useUserData((s) => s.progress[`course_lesson:${id}`]);

  const allCorrect = (answers: Record<string, { option_id?: number }>) =>
    !!d && d.questions.every((qq) => qq.options.find((o) => o.id === answers[`course_lesson:${qq.id}`]?.option_id)?.is_correct);
  const answers = useUserData((s) => s.answers);
  const done = allCorrect(answers);

  // A lesson counts as completed once every question is answered correctly.
  useEffect(() => {
    if (d && done && Number(progress?.position ?? 0) < n) {
      setProgress('course_lesson', String(id), { position: String(n), percent: Math.round((n / d.total) * 100) });
    }
  }, [d, done, id, n, progress?.position, setProgress]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title={d ? t('library.lessonOf', { n, total: d.total }) : ''} subtitle={d?.course_title} />
      {d ? (
        <View style={styles.segments}>
          {Array.from({ length: d.total }, (_, i) => (
            <View key={i} style={[styles.seg, { backgroundColor: i + 1 < n ? color.accent : i + 1 === n ? color.accent400 : color.neutral300 }]} />
          ))}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={{ padding: space.screen, gap: 14, paddingBottom: 24 }}>
        <QueryState loading={q.isPending} error={q.isError} onRetry={() => q.refetch()} />
        {d ? (
          <>
            <SectionLabel accent>{d.course_title}</SectionLabel>
            <Text accessibilityRole="header" style={styles.h2}>
              {d.title}
            </Text>
            <Blueprint style={styles.figure}>
              <Stripes />
            </Blueprint>
            <Text style={styles.body}>{d.body}</Text>
            {d.questions.map((qq) => (
              <Question key={qq.id} q={qq} />
            ))}
          </>
        ) : null}
      </ScrollView>
      {d ? (
        <View style={[styles.pinned, { paddingBottom: insets.bottom + 12 }]}>
          <PrimaryButton
            size="lg"
            disabled={!done}
            label={n < d.total ? t('library.nextLesson', { n: n + 1 }) : t('library.finish')}
            onPress={() => (n < d.total ? router.replace(`/course/${id}/${n + 1}`) : router.back())}
          />
        </View>
      ) : null}
    </View>
  );
}

function Question({ q }: { q: Schemas['QuizQuestion'] }) {
  const { t } = useTranslation();
  const key = `course_lesson:${q.id}`;
  const picked = useUserData((s) => s.answers[key]?.option_id);
  const setAnswer = useUserData((s) => s.setAnswer);
  const correct = q.options.find((o) => o.is_correct);
  const answeredRight = picked !== undefined && picked === correct?.id;

  return (
    <View style={{ gap: 10, marginTop: 6 }}>
      <Text style={styles.prompt}>{q.prompt}</Text>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {q.options.map((o) => {
          const isPicked = picked === o.id;
          // After the first pick the correct option is revealed.
          const showCorrect = picked !== undefined && o.is_correct;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: isPicked }}
              disabled={answeredRight}
              onPress={() => setAnswer('course_lesson', String(q.id), { option_id: o.id })}
              style={[styles.option, showCorrect && styles.optionCorrect]}>
              <Text style={styles.optionText}>{o.label}</Text>
              {showCorrect ? <Text style={styles.feedbackOk}>{t('library.correct')}</Text> : isPicked ? <Text style={styles.feedbackBad}>{t('library.tryAgain')}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {picked !== undefined && (q.explain_ref || q.explain_text) ? <Explain refOsis={q.explain_ref} text={q.explain_text} /> : null}
    </View>
  );
}

function Explain({ refOsis, text }: { refOsis?: string; text?: string }) {
  const uiLang = useSettings((s) => s.uiLang);
  const parsed = refOsis ? parseOsis(refOsis) : null;
  const name = useBookName(PRIMARY_TRANSLATION[uiLang] ?? 'SUV', parsed?.book ?? '');
  return (
    <Blueprint style={styles.explain}>
      {parsed ? (
        <Text style={styles.explainRef}>
          {name} {parsed.chapter}
          {parsed.verse ? `:${parsed.verse}` : ''}
        </Text>
      ) : null}
      {text ? <Text style={styles.explainText}>{text}</Text> : null}
    </Blueprint>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  segments: { flexDirection: 'row', gap: 3, paddingHorizontal: space.screen, paddingTop: 10 },
  seg: { flex: 1, height: 4 },
  h2: { fontFamily: font.heading, fontSize: type.h2, lineHeight: type.h2 * 1.12, letterSpacing: tracking(-0.015, type.h2), color: color.text },
  figure: { height: 150 },
  body: { fontFamily: font.body, fontSize: type.bodyL, lineHeight: type.bodyL * 1.6, color: color.text },
  prompt: { fontFamily: font.bodyMedium, fontSize: type.ui, color: color.text },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: color.divider },
  optionCorrect: { backgroundColor: color.accent100, borderColor: color.accent },
  optionText: { flex: 1, fontFamily: font.body, fontSize: type.bodyL, color: color.text },
  feedbackOk: { fontFamily: font.bodyMedium, fontSize: type.caption, color: color.accent700 },
  feedbackBad: { fontFamily: font.bodyMedium, fontSize: type.caption, color: color.neutral700 },
  explain: { padding: 14, gap: 6, marginTop: 4 },
  explainRef: { fontFamily: font.headingRegular, fontSize: type.bodyL, letterSpacing: tracking(0.08, type.bodyL), textTransform: 'uppercase', color: color.accent700 },
  explainText: { fontFamily: font.heading, fontSize: 21, lineHeight: 21 * 1.2, color: color.text },
  pinned: { paddingHorizontal: space.screen, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.divider, backgroundColor: color.bg },
});
