import { Pause, Play, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { color, font, hit, icon, type } from '@/theme';

import { formatClock, usePlayer, type Track } from './PlayerProvider';

type Props = {
  /**
   * Track this band offers to play. When it isn't the current one, the band shows it idle and the button starts it.
   * Omit to show whatever is playing (hidden when nothing is loaded).
   */
  cue?: Track | null;
  /** 'list' = title + subtitle (hymnal, 1h); 'progress' = time + 2px progress bar (lyrics, 2d). */
  variant?: 'list' | 'progress';
};

/** The accent900 player band from designs 1h / 2d. */
export function MiniPlayer({ cue, variant = 'list' }: Props) {
  const { t } = useTranslation();
  const p = usePlayer();
  const shown = cue ?? p.track;
  if (!shown) return null;

  const current = p.track?.id === shown.id;
  const state = current ? p.state : 'idle';
  const playing = current && state === 'ready' && p.status.playing;
  const pos = current ? p.status.currentTime : 0;
  const dur = current ? p.status.duration : 0;
  const pct = dur > 0 ? Math.min(1, pos / dur) : 0;

  const onPress = () => (current && state === 'ready' ? p.toggle() : p.play(shown));

  return (
    <View style={styles.band}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? t('hymns.player.pause') : t('hymns.player.play')}
        accessibilityState={{ busy: state === 'loading', disabled: state === 'error' }}
        disabled={state === 'loading'}
        onPress={onPress}
        style={({ pressed }) => [styles.btn, pressed && { backgroundColor: color.accent800 }]}>
        {state === 'loading' ? (
          <ActivityIndicator color={color.bg} />
        ) : state === 'error' ? (
          <TriangleAlert size={icon.tab} strokeWidth={icon.strokeWidth} color={color.accent300} />
        ) : playing ? (
          <Pause size={icon.tab} strokeWidth={icon.strokeWidth} color={color.bg} />
        ) : (
          <Play size={icon.tab} strokeWidth={icon.strokeWidth} color={color.bg} />
        )}
      </Pressable>

      {variant === 'progress' ? (
        <View style={styles.col}>
          <Text style={styles.time}>
            {state === 'error' ? t('hymns.player.unavailable') : `${formatClock(pos)} / ${formatClock(dur)}`}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct * 100}%` }]} />
          </View>
        </View>
      ) : (
        <View style={styles.col}>
          <Text numberOfLines={1} style={styles.title}>
            {shown.title}
          </Text>
          <Text numberOfLines={1} style={styles.sub}>
            {state === 'error'
              ? t('hymns.player.unavailable')
              : state === 'loading'
                ? t('hymns.player.loading')
                : [shown.subtitle, dur > 0 ? `${formatClock(pos)} / ${formatClock(dur)}` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: color.accent900 },
  btn: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.accent600 },
  col: { flex: 1, gap: 6 },
  title: { fontFamily: font.bodyMedium, fontSize: type.body, color: color.bg },
  sub: { fontFamily: font.body, fontSize: type.caption, color: color.accent300, marginTop: -4 },
  time: { fontFamily: font.body, fontSize: type.small, color: color.bg },
  track: { height: 2, backgroundColor: color.accent700 },
  fill: { height: 2, backgroundColor: color.bg },
});
