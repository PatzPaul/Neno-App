import { router } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL } from '@/api/client';
import { useMe, useUpdateMe } from '@/api/queries';
import { logout, useLogin, useSession } from '@/auth/session';
import { Blueprint } from '@/components/Blueprint';
import { ListRow, SectionLabel } from '@/components/controls';
import { PrimaryButton, Tag, Toggle } from '@/components/ui';
import { formatTarget } from '@/features/notes/refs';
import { useSunset } from '@/features/sunset/store';
import { UI_LANGS } from '@/i18n';
import { useSettings } from '@/store/settings';
import { useUserData, type Mark } from '@/store/userData';
import { color, font, hit, icon, space, type } from '@/theme';

const SCALE_STEP = 0.25;

/** Screen 1j — profile, streak, saved items and settings. */
export default function MeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uiLang, parallelLang, dataSaver, textScale, set } = useSettings();
  const city = useSunset((s) => s.city);
  const loggedIn = useSession((s) => !!s.tokens);
  const sessionUser = useSession((s) => s.user);
  const me = useMe();
  const login = useLogin(uiLang);
  const marks = useUserData((s) => s.marks);
  const progress = useUserData((s) => s.progress);
  useSettingsToServer(loggedIn);

  const nextLang = UI_LANGS[(UI_LANGS.indexOf(uiLang) + 1) % UI_LANGS.length];
  const streak = useMemo(() => readingStreak(marks, progress), [marks, progress]);
  const saved = useMemo(
    () =>
      Object.values(marks)
        .filter((m) => m.kind === 'save' && !m.deleted_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 3),
    [marks],
  );

  const name = me.data?.display_name || sessionUser?.name || me.data?.email || sessionUser?.email || '';
  const subline = me.data?.church || me.data?.email || sessionUser?.email || '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 24, gap: 18 }}>
      {loggedIn ? (
        <View style={styles.who}>
          <Blueprint style={styles.avatar}>
            <Text style={styles.initials}>{initials(name)}</Text>
          </Blueprint>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.name}>
              {name || t('tabs.me')}
            </Text>
            {subline ? (
              <Text numberOfLines={1} style={styles.church}>
                {subline}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Blueprint style={styles.loginCard}>
          <Text style={styles.loginTitle}>{t('profile.syncTitle')}</Text>
          <Text style={styles.loginBody}>{t('profile.syncBody')}</Text>
          <PrimaryButton label={t('auth.login')} disabled={!login.ready} onPress={() => void login.login()} style={{ alignSelf: 'flex-start' }} />
          {login.error ? <Text style={styles.error}>{t('auth.error')}</Text> : null}
        </Blueprint>
      )}

      <View style={styles.streak}>
        <Text style={styles.streakNum}>{streak}</Text>
        <Text style={styles.streakLabel}>{t('profile.streak')}</Text>
      </View>

      <View>
        <SectionLabel style={{ paddingBottom: 6 }}>{t('profile.saved')}</SectionLabel>
        {saved.length === 0 ? <Text style={styles.muted}>{t('profile.noSaved')}</Text> : null}
        {saved.map((m) => (
          <SavedRow key={m.id} mark={m} lang={i18n.language} />
        ))}
        <ListRow height={48} onPress={() => router.push('/notes')}>
          <Text style={[styles.rowLabel, { color: color.accent700 }]}>{t('profile.seeAll')}</Text>
        </ListRow>
      </View>

      <View>
        <SectionLabel style={{ paddingBottom: 6 }}>{t('me.settings')}</SectionLabel>
        <ListRow height={48} chevron={false} onPress={() => set({ uiLang: nextLang })}>
          <Text style={styles.rowLabel}>{t('me.language')}</Text>
          <Text style={styles.rowValue}>{t(`langs.${uiLang}.name`)}</Text>
        </ListRow>
        <SettingRow label={t('me.parallel')}>
          <Toggle label={t('me.parallel')} value={parallelLang !== null} onChange={(on) => set({ parallelLang: on ? (uiLang === 'en' ? 'sw' : 'en') : null })} />
        </SettingRow>
        <SettingRow label={t('profile.textScale')}>
          <View style={styles.stepper}>
            <StepButton label={t('profile.smaller')} Icon={Minus} disabled={textScale <= 1} onPress={() => set({ textScale: Math.max(1, round(textScale - SCALE_STEP)) })} />
            <Text style={styles.stepValue}>{Math.round(textScale * 100)}%</Text>
            <StepButton label={t('profile.larger')} Icon={Plus} disabled={textScale >= 2} onPress={() => set({ textScale: Math.min(2, round(textScale + SCALE_STEP)) })} />
          </View>
        </SettingRow>
        <ListRow height={48} onPress={() => router.push('/sunset')}>
          <Text style={styles.rowLabel}>{t('profile.sunset')}</Text>
          <Text style={styles.rowValue}>{city.name}</Text>
        </ListRow>
        <SettingRow label={t('me.dataSaver')}>
          <Toggle label={t('me.dataSaver')} value={dataSaver} onChange={(v) => set({ dataSaver: v })} />
        </SettingRow>
        <ListRow height={48} onPress={() => router.push('/downloads')}>
          <Text style={styles.rowLabel}>{t('profile.downloads')}</Text>
        </ListRow>
        <SettingRow label={t('me.server')}>
          <Text style={[styles.rowValue, { color: color.neutral700 }]} selectable>
            {API_URL}
          </Text>
        </SettingRow>
        {loggedIn ? (
          <ListRow height={48} chevron={false} onPress={() => void logout()}>
            <Text style={styles.rowLabel}>{t('auth.logout')}</Text>
          </ListRow>
        ) : null}
      </View>
    </ScrollView>
  );
}

function SavedRow({ mark, lang }: { mark: Mark; lang: string }) {
  const { t } = useTranslation();
  const months = t('sunset.months', { returnObjects: true }) as string[];
  const d = new Date(mark.updated_at);
  return (
    <ListRow height={52} onPress={() => router.push('/notes')}>
      <View style={{ minWidth: 52 }}>
        <Tag label={t(`notes.targets.${mark.target}`)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.savedTitle}>
          {formatTarget(mark.target, mark.target_ref, lang, t)}
        </Text>
        <Text style={styles.savedSub}>{`${d.getDate()} ${months[d.getMonth()] ?? ''}`}</Text>
      </View>
    </ListRow>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      {children}
    </View>
  );
}

function StepButton({ label, Icon, onPress, disabled }: { label: string; Icon: typeof Plus; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.stepBtn, disabled && { opacity: 0.4 }, pressed && { backgroundColor: 'rgba(29,31,32,0.07)' }]}>
      <Icon size={icon.inline + 2} strokeWidth={icon.strokeWidth} color={color.text} />
    </Pressable>
  );
}

/** Best-effort mirror of on-device settings to PATCH /v1/me while logged in (skips the initial render). */
function useSettingsToServer(loggedIn: boolean) {
  const { uiLang, parallelLang, dataSaver, textScale } = useSettings();
  const city = useSunset((s) => s.city);
  const update = useUpdateMe();
  const first = useRef(true);
  const mutate = update.mutate;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!loggedIn) return;
    const id = setTimeout(
      () =>
        mutate({
          ui_lang: uiLang,
          parallel_lang: parallelLang ?? '',
          data_saver: dataSaver,
          text_scale: textScale,
          sunset_city: city.name,
          sunset_lat: city.lat,
          sunset_lng: city.lng,
        }),
      800,
    );
    return () => clearTimeout(id);
  }, [loggedIn, uiLang, parallelLang, dataSaver, textScale, city.name, city.lat, city.lng, mutate]);
}

const round = (n: number) => Math.round(n * 100) / 100;

function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'N';
}

/** Consecutive local days (ending today, or yesterday if nothing yet today) with any reading activity. */
function readingStreak(marks: Record<string, { updated_at: string; created_at: string }>, progress: Record<string, { updated_at: string }>): number {
  const days = new Set<string>();
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  for (const m of Object.values(marks)) {
    days.add(key(new Date(m.created_at)));
    days.add(key(new Date(m.updated_at)));
  }
  for (const p of Object.values(progress)) days.add(key(new Date(p.updated_at)));
  const d = new Date();
  if (!days.has(key(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(key(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space.screen },
  who: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 6 },
  avatar: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: font.heading, fontSize: type.h4, color: color.accent700 },
  name: { fontFamily: font.heading, fontSize: type.h4, color: color.text },
  church: { fontFamily: font.body, fontSize: type.small, color: color.neutral700 },
  loginCard: { padding: 16, gap: 10, marginTop: 6 },
  loginTitle: { fontFamily: font.heading, fontSize: type.h4, color: color.text },
  loginBody: { fontFamily: font.body, fontSize: type.body, lineHeight: type.body * 1.5, color: color.neutral700 },
  error: { fontFamily: font.body, fontSize: type.small, color: color.accent800 },
  streak: { flexDirection: 'row', alignItems: 'baseline', gap: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.divider, paddingVertical: 12 },
  streakNum: { fontFamily: font.heading, fontSize: 34, color: color.accent700 },
  streakLabel: { fontFamily: font.body, fontSize: type.body, color: color.text },
  muted: { fontFamily: font.body, fontSize: type.body, color: color.neutral700, paddingBottom: 10 },
  savedTitle: { fontFamily: font.bodyMedium, fontSize: type.body, color: color.text },
  savedSub: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  settingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: color.divider },
  rowLabel: { fontFamily: font.body, fontSize: type.body, color: color.text },
  rowValue: { flexShrink: 1, marginLeft: 'auto', fontFamily: font.body, fontSize: type.body, color: color.accent700, textAlign: 'right' },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.divider },
  stepValue: { minWidth: 56, textAlign: 'center', fontFamily: font.body, fontSize: type.body, color: color.accent700 },
});
