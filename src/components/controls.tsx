import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { color, font, hit, icon, space, tracking, type } from '@/theme';

import { PrimaryButton } from './ui';

/** Segmented control: 1px divider outline, 1px separators, selected = accent fill + bg text, min-height 36. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View accessibilityRole="tablist" style={[styles.seg, style]}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, i > 0 && styles.segSep, on && { backgroundColor: color.accent }]}>
            <Text numberOfLines={1} style={[styles.segText, { color: on ? color.bg : color.text }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal chip row: 13px, padding 6×12, 1px border; selected = accent fill. */
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={[styles.chip, on && { backgroundColor: color.accent, borderColor: color.accent }]}>
            <Text style={[styles.chipText, { color: on ? color.bg : color.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export type HeaderAction = { Icon: LucideIcon; label: string; onPress?: () => void; active?: boolean };

/** Screen header: back button, condensed title (+ subtitle), optional right-side icon actions. */
export function ScreenHeader({ title, subtitle, back = true, actions = [], right }: { title: string; subtitle?: string; back?: boolean; actions?: HeaderAction[]; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={icon.rail} strokeWidth={icon.strokeWidth} color={color.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, paddingLeft: back ? 0 : 6 }}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.headerSub}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {actions.map((a) => (
        <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={a.onPress} style={styles.iconBtn}>
          <a.Icon size={icon.rail} strokeWidth={icon.strokeWidth} color={a.active ? color.accent700 : color.text} />
        </Pressable>
      ))}
    </View>
  );
}

export function SectionLabel({ children, accent, style }: { children: string; accent?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={[styles.section, accent && { color: color.accent700 }]}>{children}</Text>
    </View>
  );
}

export function H2({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.h2}>
      {children}
    </Text>
  );
}

/** Tappable list row with a top hairline and a trailing chevron. */
export function ListRow({ children, onPress, height = 52, chevron = true }: { children: ReactNode; onPress?: () => void; height?: number; chevron?: boolean }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { minHeight: height }, pressed && { backgroundColor: 'rgba(29,31,32,0.07)' }]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>{children}</View>
      {chevron && onPress ? <ChevronRight size={icon.inline + 4} strokeWidth={icon.strokeWidth} color={color.neutral600} /> : null}
    </Pressable>
  );
}

/** Loading skeleton / error with retry / empty, for query-backed screens. */
export function QueryState({ loading, error, empty, onRetry }: { loading?: boolean; error?: boolean; empty?: boolean; onRetry?: () => void }) {
  const { t } = useTranslation();
  if (loading)
    return (
      <View style={{ padding: space.screen, gap: 12 }}>
        {[60, 95, 85, 90, 40].map((w, i) => (
          <View key={i} style={{ height: i === 0 ? 22 : 14, width: `${w}%`, backgroundColor: color.neutral200 }} />
        ))}
      </View>
    );
  if (error)
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>{t('common.loadError')}</Text>
        {onRetry ? <PrimaryButton label={t('feed.retry')} onPress={onRetry} /> : null}
      </View>
    );
  if (empty)
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>{t('feed.empty')}</Text>
      </View>
    );
  return null;
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: color.divider },
  segItem: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segSep: { borderLeftWidth: 1, borderLeftColor: color.divider },
  segText: { fontFamily: font.body, fontSize: type.small },
  chips: { gap: 8, paddingHorizontal: space.screen },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: color.divider },
  chipText: { fontFamily: font.body, fontSize: type.small },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: color.divider, backgroundColor: color.bg,
  },
  iconBtn: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: font.heading, fontSize: type.h4, lineHeight: type.h4 * 1.1, color: color.text },
  headerSub: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  section: { fontFamily: font.body, fontSize: type.label, letterSpacing: tracking(0.1, type.label), textTransform: 'uppercase', color: color.neutral600 },
  h2: { fontFamily: font.heading, fontSize: type.h2, lineHeight: type.h2 * 1.12, letterSpacing: tracking(-0.015, type.h2), color: color.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: color.divider },
  state: { alignItems: 'center', gap: 16, padding: 32 },
  stateText: { fontFamily: font.body, fontSize: type.bodyL, color: color.neutral700, textAlign: 'center' },
});
