import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Type } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Schemas } from '@/api/client';
import { useHymn } from '@/api/queries';
import { MiniPlayer } from '@/audio/MiniPlayer';
import { usePlayer, type Track } from '@/audio/PlayerProvider';
import { QueryState, SectionLabel, Segmented } from '@/components/controls';
import { Tag } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { color, font, hit, icon, space, type } from '@/theme';

type AudioMode = 'choir' | 'piano' | 'none';
const SCALES = [1, 1.25, 1.5, 1.75, 2];

/** Screen 2d — hymn lyrics with stanza jump tags and choir / piano / silent audio. */
export default function HymnScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { code, number } = useLocalSearchParams<{ code: string; number: string }>();
  const hymn = useHymn(code, Number(number));
  const textScale = useSettings((s) => s.textScale);
  const set = useSettings((s) => s.set);
  const player = usePlayer();
  const [mode, setMode] = useState<AudioMode>('choir');
  const [active, setActive] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const offsets = useRef<Record<number, number>>({});

  const h = hymn.data;
  const labels = useMemo(() => stanzaLabels(h?.stanzas ?? [], t), [h?.stanzas, t]);

  const media = h ? (mode === 'choir' ? h.audio_choir : mode === 'piano' ? h.audio_piano : undefined) : undefined;
  const cue: Track | null =
    h && media ? { id: `hymn:${h.hymnal}/${h.number}:${mode}`, title: `${h.number}. ${h.title}`, subtitle: t(`hymns.${mode}`), url: media.url } : null;

  const pickMode = (m: AudioMode) => {
    setMode(m);
    // Switching away from the playing version of this hymn stops it; "Bila sauti" means silence.
    if (player.track?.id.startsWith(`hymn:${h?.hymnal}/${h?.number}:`)) player.stop();
  };

  const nextScale = () => {
    const i = SCALES.findIndex((s) => s >= textScale - 0.01);
    set({ textScale: SCALES[(i + 1) % SCALES.length] });
  };

  const lyricSize = 26 * textScale;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
        </Pressable>
        {h ? (
          <>
            <Text style={styles.number}>{h.number}</Text>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.title}>
                {h.title}
              </Text>
              {h.original_title ? (
                <Text numberOfLines={1} style={styles.original}>
                  {h.original_title}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('common.textSize')} ${Math.round(textScale * 100)}%`} onPress={nextScale} style={styles.iconBtn}>
          <Type size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
        </Pressable>
      </View>

      {hymn.isPending ? (
        <QueryState loading />
      ) : hymn.isError || !h ? (
        <QueryState error onRetry={() => hymn.refetch()} />
      ) : (
        <ScrollView ref={scroll} contentContainerStyle={styles.body}>
          {h.stanzas.length > 1 ? (
            <View style={styles.tags}>
              {h.stanzas.map((s, i) => (
                <Pressable
                  key={s.idx}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === active }}
                  hitSlop={{ top: 12, bottom: 12, left: 2, right: 2 }}
                  onPress={() => {
                    setActive(i);
                    scroll.current?.scrollTo({ y: Math.max(0, (offsets.current[i] ?? 0) - 12), animated: true });
                  }}>
                  <Tag label={labels[i]} variant={i === active ? 'accent' : 'neutral'} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {h.stanzas.map((s, i) => (
            <View
              key={s.idx}
              onLayout={(e) => {
                offsets.current[i] = e.nativeEvent.layout.y;
              }}
              style={{ gap: 6 }}>
              {h.stanzas.length > 1 ? <Text style={styles.stanzaLabel}>{labels[i]}</Text> : null}
              <Text
                maxFontSizeMultiplier={1.4}
                style={[styles.lyrics, { fontSize: lyricSize, lineHeight: lyricSize * 1.3 }, s.kind === 'refrain' && styles.refrain]}>
                {s.text}
              </Text>
            </View>
          ))}

          <View style={{ gap: 8 }}>
            <SectionLabel>{t('hymns.audio')}</SectionLabel>
            <Segmented
              options={[
                { value: 'choir', label: t('hymns.choir') },
                { value: 'piano', label: t('hymns.piano') },
                { value: 'none', label: t('hymns.silent') },
              ]}
              value={mode}
              onChange={pickMode}
            />
            {mode !== 'none' && !media ? <Text style={styles.note}>{t('hymns.noAudio')}</Text> : null}
          </View>
        </ScrollView>
      )}

      <MiniPlayer cue={cue} variant="progress" />
    </View>
  );
}

function stanzaLabels(stanzas: Schemas['HymnStanza'][], t: (k: string, o?: Record<string, unknown>) => string) {
  let verse = 0;
  return stanzas.map((s) => (s.kind === 'refrain' ? t('hymns.refrain') : t('hymns.verse', { n: ++verse })));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: color.divider,
  },
  iconBtn: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  number: { fontFamily: font.heading, fontSize: type.h3, color: color.accent700 },
  title: { fontFamily: font.heading, fontSize: type.h6, lineHeight: type.h6 * 1.1, color: color.text },
  original: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  body: { paddingHorizontal: space.screen, paddingTop: 16, paddingBottom: 24, gap: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stanzaLabel: { fontFamily: font.body, fontSize: type.label, letterSpacing: 1.1, textTransform: 'uppercase', color: color.neutral600 },
  lyrics: { fontFamily: font.heading, color: color.text },
  refrain: { color: color.accent800 },
  note: { fontFamily: font.body, fontSize: type.small, color: color.neutral700 },
});
