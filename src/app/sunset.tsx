import * as Location from 'expo-location';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, LocateFixed } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionLabel } from '@/components/controls';
import { Toggle } from '@/components/ui';
import { cancelReminders, scheduleReminders } from '@/features/sunset/reminders';
import { CITIES, DEVICE_CITY_ID, useSunset, type City } from '@/features/sunset/store';
import { formatTime, localDate, nextFridays, sabbathState, sunset, weekday, type LocalDate } from '@/features/sunset/sun';
import { color, font, hit, icon, space, tracking, type } from '@/theme';

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Screen 2f — Sabbath sunset times, computed on device (works offline), with a Friday reminder. */
export default function SunsetScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { city, remind, setCity, setRemind, setNotificationIds } = useSunset();
  const [notice, setNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const days = t('sunset.days', { returnObjects: true }) as string[];
  const months = t('sunset.months', { returnObjects: true }) as string[];
  const fmtDate = (ld: LocalDate) => `${days[weekday(ld)]} ${ld.d} ${months[ld.m - 1]}`;

  const state = useMemo(() => sabbathState(now, city), [now, city]);
  const fridays = useMemo(() => nextFridays(now, city, 4), [now, city]);
  const target = state.kind === 'during' ? state.end : state.start;
  const left = Math.max(0, target.getTime() - now.getTime());
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);

  // Keep the next four reminders scheduled for the chosen place (also refreshes the rolling window on open).
  useEffect(() => {
    let cancelled = false;
    const prev = useSunset.getState().notificationIds;
    (async () => {
      if (!remind) {
        await cancelReminders(prev);
        if (!cancelled) setNotificationIds([]);
        return;
      }
      const ids = await scheduleReminders(city, prev).catch(() => null);
      if (cancelled) return;
      if (ids === null) {
        setRemind(false);
        setNotice(t('sunset.remindDenied'));
      } else setNotificationIds(ids);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reschedule only when the place or the toggle changes
  }, [remind, city.id, city.lat, city.lng]);

  const useMyLocation = async () => {
    setNotice(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setNotice(t('sunset.locationDenied'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let name = t('sunset.myLocation');
      let country = '';
      try {
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        name = geo?.city ?? geo?.subregion ?? name;
        country = geo?.country ?? '';
      } catch {
        // Offline: keep the generic label; the sunset math only needs coordinates.
      }
      setCity({
        id: DEVICE_CITY_ID,
        name,
        country,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        tz: -new Date().getTimezoneOffset() / 60,
      });
    } catch {
      setNotice(t('sunset.locationDenied'));
    } finally {
      setLocating(false);
    }
  };

  const headline =
    state.kind === 'during'
      ? t('sunset.during', { date: `${fmtDate(state.endDate)} ${formatTime(state.end, city.tz)}` })
      : state.isToday
        ? t('sunset.startsToday', { date: fmtDate(state.startDate) })
        : t('sunset.startsOn', { date: fmtDate(state.startDate) });

  const others = CITIES.filter((c) => c.id !== city.id);
  const today = localDate(now, city.tz);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.hero, { paddingTop: insets.top + 6 }]}>
        <View style={styles.heroTop}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.back}>
            <ChevronLeft size={icon.rail} strokeWidth={icon.strokeWidth} color={color.bg} />
          </Pressable>
          <Text numberOfLines={1} style={styles.place}>
            {[city.name, city.country].filter(Boolean).join(', ')} · {t('sunset.offline')}
          </Text>
        </View>
        <Text style={styles.kicker}>{headline}</Text>
        <Text accessibilityRole="header" style={styles.time}>
          {formatTime(state.kind === 'during' ? state.end : state.start, city.tz)}
        </Text>
        <Text style={styles.countdown}>{h > 0 ? t('sunset.countdown', { h, m }) : t('sunset.countdownMin', { m })}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.remindRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.remindTitle}>{t('sunset.remind')}</Text>
            <Text style={styles.remindSub}>{t('sunset.remindSub')}</Text>
          </View>
          {Platform.OS !== 'web' ? (
            <Toggle
              label={t('sunset.remind')}
              value={remind}
              onChange={(v) => {
                setNotice(null);
                setRemind(v);
              }}
            />
          ) : null}
        </View>

        <Pressable accessibilityRole="button" disabled={locating} onPress={useMyLocation} style={({ pressed }) => [styles.locate, pressed && { backgroundColor: 'rgba(29,31,32,0.07)' }]}>
          <LocateFixed size={icon.inline + 4} strokeWidth={icon.strokeWidth} color={color.accent700} />
          <Text style={styles.locateText}>{locating ? t('sunset.locating') : t('sunset.useLocation')}</Text>
        </Pressable>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <View>
          <SectionLabel style={{ paddingBottom: 6 }}>{t('sunset.upcoming', { city: city.name })}</SectionLabel>
          {fridays.map((f) => (
            <View key={`${f.date.y}-${f.date.m}-${f.date.d}`} style={styles.row}>
              <Text style={styles.rowLabel}>{fmtDate(f.date)}</Text>
              <Text style={styles.rowTime}>{formatTime(f.sunset, city.tz)}</Text>
            </View>
          ))}
        </View>

        <View>
          <SectionLabel style={{ paddingBottom: 6 }}>{t('sunset.otherCities')}</SectionLabel>
          {others.map((c) => (
            <CityRow key={c.id} city={c} day={today} onPress={() => setCity(c)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CityRow({ city, day, onPress }: { city: City; day: LocalDate; onPress: () => void }) {
  const s = sunset(day, city);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(29,31,32,0.07)' }]}>
      <Text style={styles.rowLabel}>{city.name}</Text>
      <Text style={styles.rowTime}>{s ? formatTime(s, city.tz) : '—'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  hero: { backgroundColor: color.accent900, paddingHorizontal: 20, paddingBottom: 26, gap: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: hit.min, height: hit.min, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  place: { flex: 1, fontFamily: font.body, fontSize: type.small, color: color.accent300 },
  kicker: {
    fontFamily: font.body, fontSize: type.small, letterSpacing: tracking(0.1, type.small), textTransform: 'uppercase',
    color: color.accent300, marginTop: 10,
  },
  time: { fontFamily: font.heading, fontSize: type.display, lineHeight: type.display, color: color.bg },
  countdown: { fontFamily: font.body, fontSize: type.bodyL, color: color.accent200 },
  body: { paddingHorizontal: space.screen, paddingTop: 18, gap: 18 },
  remindRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderWidth: 1, borderColor: color.divider, paddingHorizontal: 14 },
  remindTitle: { fontFamily: font.bodyMedium, fontSize: type.bodyL, color: color.text },
  remindSub: { fontFamily: font.body, fontSize: type.caption, color: color.neutral700 },
  locate: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: hit.min, marginTop: -6 },
  locateText: { fontFamily: font.body, fontSize: type.body, color: color.accent700 },
  notice: { fontFamily: font.body, fontSize: type.small, color: color.neutral700, marginTop: -10 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderTopWidth: 1, borderTopColor: color.divider },
  rowLabel: { flex: 1, fontFamily: font.body, fontSize: type.bodyL, color: color.text },
  rowTime: { fontFamily: font.heading, fontSize: type.h6, color: color.text },
});
