import { router, type Href } from 'expo-router';
import { Bookmark, Download, Headphones, Heart, Share2, type LucideIcon } from 'lucide-react-native';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import type { FeedItem } from '@/api/client';
import { formatBytes } from '@/api/queries';
import { Blueprint } from '@/components/Blueprint';
import { PrimaryButton, Stripes, Tag } from '@/components/ui';
import { findLiveMark, useUserData } from '@/store/userData';
import { color, font, hit, icon, tracking, type } from '@/theme';

type Props = { item: FeedItem; height: number; showParallel: boolean; dataSaver: boolean };

// cta_target is "<target_kind>:<ref>"; route to the tab that owns that content.
const CTA_ROUTES: Record<string, Href> = {
  verse: '/biblia',
  hymn: '/nyimbo',
  course_lesson: '/maktaba',
  egw_paragraph: '/maktaba',
  belief: '/maktaba',
  ss_day: '/sabbath-school',
};

export const FeedItemView = memo(function FeedItemView({ item, height, showParallel, dataSaver }: Props) {
  const { t } = useTranslation();
  const like = useUserData((s) => findLiveMark(s.marks, 'like', 'feed_item', item.id));
  const saved = useUserData((s) => !!findLiveMark(s.marks, 'save', 'feed_item', item.id));
  const toggle = useUserData((s) => s.toggleMark);
  // Server count plus our like while it is still in the outbox.
  const likeCount = (item.like_count ?? 0) + (like?.dirty ? 1 : 0);

  const cta = item.cta_label && item.cta_target ? CTA_ROUTES[item.cta_target.split(':')[0]] : undefined;
  const share = () => Share.share({ message: [item.body, item.ref_label].filter(Boolean).join('\n— ') });

  return (
    <View style={[styles.item, { height }]}>
      <View style={styles.meta}>
        <Tag label={item.kicker} />
        {item.source ? <Text style={styles.source}>{item.source}</Text> : null}
      </View>

      {item.media ? (
        dataSaver && item.media.kind === 'video' ? (
          <View style={styles.saverRow}>
            <Download size={icon.inline} strokeWidth={icon.strokeWidth} color={color.accent700} />
            <Text style={styles.saverText}>{t('feed.dataSaverMedia', { size: formatBytes(item.media.bytes ?? 0) })}</Text>
          </View>
        ) : (
          <Blueprint style={styles.figure}>
            <Stripes />
            <Text style={styles.figureLabel}>
              {item.media.kind}
              {item.media.duration_s ? ` · ${Math.floor(item.media.duration_s / 60)}:${String(item.media.duration_s % 60).padStart(2, '0')}` : ''}
            </Text>
          </Blueprint>
        )
      ) : null}

      <Text style={styles.body} maxFontSizeMultiplier={2}>
        {item.body}
      </Text>
      {showParallel && item.alt_body ? (
        <Text style={styles.alt} maxFontSizeMultiplier={2}>
          {item.alt_body}
        </Text>
      ) : null}
      {item.ref_label ? <Text style={styles.ref}>{item.ref_label}</Text> : null}
      {cta ? <PrimaryButton label={item.cta_label!} onPress={() => router.navigate(cta)} style={styles.cta} /> : null}

      <View style={styles.rail}>
        <RailButton Icon={Heart} label={likeCount > 0 ? String(likeCount) : t('feed.like')} a11yLabel={t('feed.like')} active={!!like} onPress={() => toggle('like', 'feed_item', item.id)} />
        <RailButton Icon={Bookmark} label={t('feed.save')} active={saved} onPress={() => toggle('save', 'feed_item', item.id)} />
        {item.media?.kind === 'audio' ? <RailButton Icon={Headphones} label={t('feed.listen')} /> : null}
        <RailButton Icon={Share2} label={t('feed.share')} onPress={share} />
      </View>
    </View>
  );
});

function RailButton({ Icon, label, a11yLabel, active, onPress }: { Icon: LucideIcon; label: string; a11yLabel?: string; active?: boolean; onPress?: () => void }) {
  const tint = active ? color.accent : color.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.railBtn, pressed && { opacity: 0.6 }]}>
      <Icon size={icon.rail} strokeWidth={icon.strokeWidth} color={tint} fill={active ? tint : 'none'} />
      <Text style={[styles.railLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { justifyContent: 'center', gap: 14, paddingTop: 60, paddingRight: 72, paddingBottom: 28, paddingLeft: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  source: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  figure: { height: 170, alignItems: 'center', justifyContent: 'center' },
  figureLabel: { fontFamily: font.mono, fontSize: 11, backgroundColor: color.bg, paddingVertical: 3, paddingHorizontal: 6, color: color.text },
  saverRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: color.divider, paddingVertical: 10, paddingHorizontal: 12 },
  saverText: { flex: 1, fontFamily: font.body, fontSize: type.small, color: color.accent700 },
  body: { fontFamily: font.heading, fontSize: type.feed, lineHeight: type.feed * 1.14, letterSpacing: tracking(-0.015, type.feed), color: color.text },
  alt: { fontFamily: font.body, fontSize: type.body, lineHeight: type.body * 1.5, color: color.neutral700 },
  ref: { fontFamily: font.headingRegular, fontSize: type.bodyL, letterSpacing: tracking(0.08, type.bodyL), textTransform: 'uppercase', color: color.accent700 },
  cta: { alignSelf: 'flex-start' },
  rail: { position: 'absolute', right: 10, bottom: 36, gap: 14, alignItems: 'center' },
  railBtn: { minWidth: hit.rail, minHeight: hit.rail, alignItems: 'center', justifyContent: 'center', gap: 2 },
  railLabel: { fontFamily: font.body, fontSize: 11 },
});
